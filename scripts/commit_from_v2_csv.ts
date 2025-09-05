#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

function parseArgs(argv: string[]) {
  const args: any = {};
  for (const a of argv) {
    if (a.startsWith('--csv=')) args.csv = a.slice(6);
    else if (a.startsWith('--batch-id=')) args.batchId = a.slice(11);
  }
  if (!args.csv) throw new Error('Usage: tsx scripts/commit_from_v2_csv.ts --csv data/seed/batches/auto_CO_YYYYMMDD_new.csv --batch-id=YYYYMMDD-auto-CO');
  return args as { csv: string; batchId?: string };
}

function parseCsv(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  const lines = raw.split(/\r?\n/);
  const header = lines.shift()!;
  const cols = header.split(',');
  const idx: Record<string, number> = Object.fromEntries(cols.map((c, i) => [c, i]));
  const rows = lines.map((line) => {
    // Basic CSV split that handles quotes
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else {
        if (ch === ',') { out.push(cur); cur = ''; }
        else if (ch === '"') inQ = true;
        else cur += ch;
      }
    }
    out.push(cur);
    function get(k: string) { return out[idx[k]] ?? ''; }
    return {
      id: get('id'),
      provider: get('provider'),
      name: get('name'),
      name_en: get('name_en') || null,
      category: get('category'),
      country: get('country'),
      base_price: Number(get('base_price')),
      currency: get('currency'),
      external_link: get('external_link'),
      brochure_link: get('brochure_link') || null,
      benefits: get('benefits'),
      benefits_en: get('benefits_en'),
      tags: get('tags') || '[]'
    };
  });
  return rows;
}

async function main() {
  const { csv: csvPath } = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL && !process.env.RENDER_POSTGRES_URL) throw new Error('DATABASE_URL/RENDER_POSTGRES_URL required');
  const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rows = parseCsv(csvPath);

  await client.query('BEGIN');
  try {
    // Partitioned replace
    await client.query(`DELETE FROM public.plans_v2 WHERE category='auto' AND country='CO'`);

    const insertSQL = `INSERT INTO public.plans_v2
      (id, provider, name, name_en, category, country, base_price, currency, external_link, brochure_link, benefits, benefits_en, tags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        provider=EXCLUDED.provider,
        name=EXCLUDED.name,
        name_en=EXCLUDED.name_en,
        category=EXCLUDED.category,
        country=EXCLUDED.country,
        base_price=EXCLUDED.base_price,
        currency=EXCLUDED.currency,
        external_link=EXCLUDED.external_link,
        brochure_link=EXCLUDED.brochure_link,
        benefits=EXCLUDED.benefits,
        benefits_en=EXCLUDED.benefits_en,
        tags=EXCLUDED.tags`;

    let inserted = 0;
    for (const r of rows) {
      if (r.category !== 'auto' || r.country !== 'CO') continue;
      if (!Array.isArray(JSON.parse(r.benefits)) || JSON.parse(r.benefits).length === 0) throw new Error(`Empty benefits for id=${r.id}`);
      if (!Array.isArray(JSON.parse(r.benefits_en)) || JSON.parse(r.benefits_en).length === 0) throw new Error(`Empty benefits_en for id=${r.id}`);
      await client.query(insertSQL, [
        r.id, r.provider, r.name, r.name_en, r.category, r.country, r.base_price, r.currency, r.external_link, r.brochure_link, r.benefits, r.benefits_en, r.tags
      ]);
      inserted++;
    }
    await client.query('COMMIT');
    const out = { inserted };
    const outPath = path.join(process.cwd(), 'data', 'audit', 'auto_CO_commit_result.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(outPath);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });


