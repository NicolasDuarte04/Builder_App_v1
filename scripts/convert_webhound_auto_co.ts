#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { normalizeCarrier } from './rel/normalize.ts';

type WHAttr<T=any> = { value: T } | null | undefined;
type WHRow = { id?: string; attributes?: Record<string, WHAttr> };
type WHFile = { metadata?: any; data: WHRow[] };

function getAttr<T>(row: WHRow, key: string): T | null {
  const a = row.attributes?.[key] as WHAttr<T> | undefined;
  if (!a) return null;
  return (a.value as unknown as T) ?? null;
}

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}

async function pickSourceFile(): Promise<string> {
  // Preferred: most recent data/seed/raw/auto_CO_*.json
  const rawMatches = await glob('data/seed/raw/auto_CO_*.json', { withFileTypes: true });
  if (rawMatches.length) {
    const newest = rawMatches
      .map((d) => ({ f: d.fullpath() ?? d.name, t: fs.statSync(d.fullpath() ?? d.name).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0]!.f;
    return newest;
  }
  // Fallback: Desktop path provided by user
  const desktopPath = '/Users/nicolasduarte/Desktop/webhound-colombian_auto_insurance_plan.json';
  if (fs.existsSync(desktopPath)) return desktopPath;
  throw new Error('No source JSON found: expected data/seed/raw/auto_CO_*.json or Desktop/webhound-colombian_auto_insurance_plan.json');
}

function ensureArray(a: any): string[] {
  if (Array.isArray(a)) return a.map((x) => String(x));
  if (a == null) return [];
  return [String(a)];
}

function toCsvLine(values: (string|number|null)[]): string {
  return values.map((v) => {
    if (v == null) return '';
    const s = typeof v === 'number' ? String(v) : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(',');
}

async function main() {
  const source = await pickSourceFile();
  console.log(`[convert] source: ${source}`);
  const raw = fs.readFileSync(source, 'utf8');
  const parsed = JSON.parse(raw) as WHFile;
  if (!Array.isArray(parsed?.data)) throw new Error('Invalid Webhound JSON: missing data array');

  const rows = parsed.data;
  const usedIds = new Set<string>();
  const rejects: any[] = [];

  const date = todayStamp();
  const outDirBatches = path.join(process.cwd(), 'data', 'seed', 'batches');
  fs.mkdirSync(outDirBatches, { recursive: true });

  const outV2 = path.join(outDirBatches, `auto_CO_${date}_new.csv`);
  const outStage = path.join(outDirBatches, `auto_CO_${date}_stage.csv`);

  // v2 CSV header
  const v2Header = ['id','provider','name','name_en','category','country','base_price','currency','external_link','brochure_link','benefits','benefits_en','tags'];
  const v2Lines: string[] = [v2Header.join(',')];

  // stage CSV header (plans_stage contract)
  const stHeader = ['product','country','carrier_name','plan_name','variant','currency','premium_amount_month','coverage_json','limits_json','deductibles_json','tags','source_url','notes'];
  const stLines: string[] = [stHeader.join(',')];

  for (const row of rows) {
    const id = (getAttr<string>(row, 'id') || row.id || '').toString().trim();
    const providerRaw = getAttr<string>(row, 'provider') || getAttr<string>(row, 'provider_es') || '';
    const provider = normalizeCarrier(providerRaw || '');
    const name = getAttr<string>(row, 'name') || getAttr<string>(row, 'plan_name_es') || '';
    const name_en = getAttr<string>(row, 'name_en') || getAttr<string>(row, 'plan_name_en') || '';
    const category = (getAttr<string>(row, 'category') || 'auto').toLowerCase();
    const country = (getAttr<string>(row, 'country') || 'CO').toUpperCase();
    const base_price = Number(getAttr<number>(row, 'base_price') ?? 0);
    const currency = (getAttr<string>(row, 'currency') || 'COP').toUpperCase();
    const external_link = getAttr<string>(row, 'external_link') || '';
    const brochure_link = getAttr<string>(row, 'brochure_link') || '';
    const benefitsArr = ensureArray(getAttr<any>(row, 'benefits'));
    const benefitsEnArr = ensureArray(getAttr<any>(row, 'benefits_en'));
    const tagsArr = ensureArray(getAttr<any>(row, 'tags'));

    // Constraints
    let reason: string | null = null;
    if (!id) reason = 'missing id';
    else if (usedIds.has(id)) reason = 'duplicate id';
    else if (category !== 'auto') reason = `category ${category}`;
    else if (country !== 'CO') reason = `country ${country}`;
    else if (currency !== 'COP') reason = `currency ${currency}`;
    else if (!provider || !name) reason = 'missing provider/name';
    else if (!Number.isFinite(base_price) || base_price <= 0 || base_price > 1200000) reason = `base_price ${base_price}`;
    else if (!Array.isArray(benefitsArr) || benefitsArr.length === 0) reason = 'empty benefits';
    else if (!Array.isArray(benefitsEnArr) || benefitsEnArr.length === 0) reason = 'empty benefits_en';

    if (reason) {
      rejects.push({ id, provider, name, reason });
      continue;
    }

    usedIds.add(id);

    const v2Values = [
      id,
      provider,
      name,
      name_en || '',
      'auto',
      'CO',
      base_price,
      'COP',
      external_link,
      brochure_link || '',
      JSON.stringify(benefitsArr),
      JSON.stringify(benefitsEnArr),
      JSON.stringify(tagsArr.length ? tagsArr : ['auto'])
    ];
    v2Lines.push(toCsvLine(v2Values));

    const stageValues = [
      'auto',
      'CO',
      provider,
      name,
      '',
      'COP',
      base_price,
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify(tagsArr.length ? tagsArr : ['auto']),
      external_link,
      ''
    ];
    stLines.push(toCsvLine(stageValues));
  }

  const auditDir = path.join(process.cwd(), 'data', 'audit');
  fs.mkdirSync(auditDir, { recursive: true });

  if (rejects.length > 0) {
    const rejPath = path.join(auditDir, 'auto_CO_rejects.json');
    fs.writeFileSync(rejPath, JSON.stringify({ source, rejects }, null, 2), 'utf8');
    console.error(`[convert] rejects: ${rejects.length} -> ${rejPath}`);
    process.exit(2);
  }

  fs.writeFileSync(outV2, v2Lines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(outStage, stLines.join('\n') + '\n', 'utf8');
  console.log(`[convert] v2 csv: ${outV2}`);
  console.log(`[convert] stage csv: ${outStage}`);
}

main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });


