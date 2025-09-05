#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import Papa from 'papaparse';
import { getDbMode } from '@/lib/db/env';
import { sql } from '@/lib/db/client';
import { normalizeCarrier } from '@/lib/catalog/normalize';
import { getMonthlyCap } from '@/lib/catalog/sanityCaps';

type Row = {
  product: string;
  country: string;
  carrier_name: string;
  plan_name: string;
  variant: string;
  currency: string;
  premium_amount_month: string;
  coverage_json: string;
  limits_json: string;
  deductibles_json: string;
  tags: string;
  source_url: string;
  notes: string;
};

function parseArgs(argv: string[]) {
  const args = { batchId: '', dryRun: false, doWrite: false, patterns: [] as string[] };
  for (const a of argv) {
    if (a.startsWith('--batch-id=')) args.batchId = a.split('=')[1];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--write') args.doWrite = true;
    else args.patterns.push(a);
  }
  if (!args.batchId) throw new Error('Missing --batch-id=YYYYMMDD-HHMM');
  if (args.patterns.length === 0) throw new Error('Usage: tsx scripts/load-to-staging.ts --batch-id=STAMP --dry-run "data/seed/**/*.csv"');
  return args;
}

function loadCsv(file: string): Row[] {
  const content = fs.readFileSync(file, 'utf8');
  const parsed = Papa.parse<Row>(content, { header: true, skipEmptyLines: 'greedy' });
  return parsed.data;
}

function makeKey(r: Row) {
  const v = (r.variant && r.variant.trim()) ? r.variant.trim().toLowerCase() : 'standard';
  return `${r.product}|${r.country}|${r.carrier_name.trim().toLowerCase()}|${r.plan_name.trim().toLowerCase()}|${v}`;
}

async function dryRun(files: string[], batchId: string) {
  // In dry-run, we do not touch DB. We still try to compare vs prod if DB is available; otherwise, mark all as new.
  let prodKeys = new Set<string>();
  try {
    const res = await sql<{ product: string; country: string; carrier_name: string; plan_name: string; variant: string }>(
      `select product, country, carrier_name, plan_name, coalesce(variant,'standard') as variant from public.plans_v2`
    );
    prodKeys = new Set(res.rows.map(r => `${r.product}|${r.country}|${r.carrier_name.trim().toLowerCase()}|${r.plan_name.trim().toLowerCase()}|${(r.variant||'standard').toLowerCase()}`));
  } catch {
    // no DB available; proceed assuming all new
  }

  const rows: Row[] = files.flatMap(loadCsv);
  const out = rows.map(r => ({ key: makeKey(r), status: prodKeys.has(makeKey(r)) ? 'update' : 'new' }));
  const byCatCountry: Record<string, { new: number; update: number; total: number }> = {};
  for (const r of rows) {
    const k = `${r.product}|${r.country}`;
    byCatCountry[k] ||= { new: 0, update: 0, total: 0 };
    byCatCountry[k].total++;
    if (prodKeys.has(makeKey(r))) byCatCountry[k].update++; else byCatCountry[k].new++;
  }
  const outDir = path.join(process.cwd(), 'data', 'audit');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'dryrun_diff.json'), JSON.stringify({ batchId, files, summary: byCatCountry, rows: out }, null, 2), 'utf8');
  console.log(path.join(outDir, 'dryrun_diff.json'));
}

async function main() {
  const { batchId, dryRun: isDryRun, doWrite, patterns } = parseArgs(process.argv.slice(2));
  const files = (await Promise.all(patterns.map(p => glob(p)))).flat();
  if (files.length === 0) throw new Error('No files matched');

  // Always require validation to be run beforehand (optional: we could run it here)
  if (isDryRun) {
    await dryRun(files, batchId);
    return;
  }

  // Not dry run: guard writes; do not perform upsert yet
  if (!doWrite || getDbMode() !== 'READWRITE') {
    throw new Error('Write mode disabled. Run with READWRITE=1 to allow staging writes (commit function stays disabled).');
  }
  // Truncate only partition (auto|CO) and insert with normalization
  const content = files.flatMap(loadCsv);
  const rejects: any[] = [];
  const accepted: Row[] = [];
  for (const r of content) {
    const product = r.product.trim().toLowerCase();
    const country = r.country.trim().toUpperCase();
    const currency = r.currency.trim().toUpperCase();
    if (!(product === 'auto' && country === 'CO')) {
      rejects.push({ reason: 'partition-filter', row: r });
      continue;
    }
    const cap = getMonthlyCap('auto' as any, 'CO' as any, currency as any) ?? 1200000;
    const price = Number(r.premium_amount_month);
    const normalizedCarrier = normalizeCarrier(r.carrier_name);
    if (!Number.isFinite(price) || price <= 0 || price > cap) {
      rejects.push({ reason: 'price-cap', cap, row: r });
      continue;
    }
    accepted.push({ ...r, carrier_name: normalizedCarrier, premium_amount_month: String(price) });
  }
  if (rejects.length) {
    const rejPath = files.length === 1 ? `${files[0].replace(/\.csv$/,'')}.rejects.json` : `data/seed/batches/auto_CO.rejects.json`;
    require('fs').writeFileSync(rejPath, JSON.stringify({ batchId, rejects }, null, 2));
    throw new Error(`Rejects found: ${rejects.length}. See ${rejPath}`);
  }

  await sql(`DELETE FROM public.plans_stage WHERE product = 'auto' AND country = 'CO'`);
  for (const r of accepted) {
    await sql(
      `INSERT INTO public.plans_stage (
        product,country,carrier_name,plan_name,variant,currency,premium_amount_month,
        coverage_json,limits_json,deductibles_json,tags,source_url,notes,ingest_batch_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14)`,
      [
        r.product,
        r.country,
        r.carrier_name,
        r.plan_name,
        r.variant || null,
        r.currency,
        Number(r.premium_amount_month),
        r.coverage_json || '{}',
        r.limits_json || '{}',
        r.deductibles_json || '{}',
        r.tags || null,
        r.source_url,
        r.notes || null,
        batchId,
      ],
    );
  }
  const out = { batchId, inserted: accepted.length };
  const outPath = require('path').join(process.cwd(), 'data', 'audit', 'auto_CO_stage_result.json');
  require('fs').mkdirSync(require('path').dirname(outPath), { recursive: true });
  require('fs').writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(outPath);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});


