#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import Papa from 'papaparse';
import { AllowedProducts, AllowedCountries, AllowedCurrencies, CoverageKeys } from '@/lib/catalog/allowlists';
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

const REQUIRED_HEADER: Array<keyof Row> = [
  'product','country','carrier_name','plan_name','variant','currency','premium_amount_month','coverage_json','limits_json','deductibles_json','tags','source_url','notes'
];

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function isHttps(url: string): boolean {
  try { const u = new URL(url); return u.protocol === 'https:'; } catch { return false; }
}

function parseJsonObject(name: string, value: string): Record<string, unknown> | null {
  if (value == null || String(value).trim() === '') return {};
  try {
    const obj = JSON.parse(value);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, unknown>;
    return null;
  } catch {
    console.error(`[json] ${name} is not valid JSON`);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) fail('Usage: tsx scripts/validate-plans-csv.ts "data/seed/**/*.csv"');

  const patterns = args;
  const files = (await Promise.all(patterns.map(p => glob(p)))).flat().filter(Boolean);
  if (files.length === 0) fail('No CSV files matched the provided patterns');

  const report: any = { files: [], errors: 0, warnings: 0 };

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const parsed = Papa.parse<Row>(content, { header: true, skipEmptyLines: 'greedy' });
    const fileReport: any = { file, rows: parsed.data.length, errors: [], warnings: [] };

    // Header check (exact order)
    const header = parsed.meta.fields || [];
    const headerOk = REQUIRED_HEADER.length === header.length && REQUIRED_HEADER.every((k, i) => header[i] === k);
    if (!headerOk) {
      fileReport.errors.push({ type: 'header', message: `Invalid header. Expected exact order: ${REQUIRED_HEADER.join(',')}. Got: ${header.join(',')}` });
    }

    parsed.data.forEach((row, idx) => {
      const rowId = idx + 2; // 1-based; +1 for header
      // Required fields
      const required: Array<keyof Row> = ['product','country','carrier_name','plan_name','currency','premium_amount_month','coverage_json','limits_json','deductibles_json','source_url'];
      for (const key of required) {
        if (row[key] == null || String(row[key]).trim() === '') {
          fileReport.errors.push({ row: rowId, field: key, message: 'required' });
        }
      }

      // Allowlists
      if (!AllowedProducts.includes(row.product as any)) fileReport.errors.push({ row: rowId, field: 'product', message: `invalid product '${row.product}'` });
      if (!AllowedCountries.includes(row.country as any)) fileReport.errors.push({ row: rowId, field: 'country', message: `invalid country '${row.country}'` });
      if (!AllowedCurrencies.includes(row.currency as any)) fileReport.errors.push({ row: rowId, field: 'currency', message: `invalid currency '${row.currency}'` });

      // Premium numeric and caps
      const premium = Number(row.premium_amount_month);
      if (!Number.isFinite(premium) || premium <= 0) {
        fileReport.errors.push({ row: rowId, field: 'premium_amount_month', message: 'must be numeric > 0' });
      } else {
        const cap = getMonthlyCap(row.product as any, row.country as any, row.currency as any);
        if (cap != null && premium > cap) {
          fileReport.warnings.push({ row: rowId, field: 'premium_amount_month', message: `exceeds cap ${cap}` });
        }
      }

      // JSON objects
      const cov = parseJsonObject('coverage_json', row.coverage_json);
      const lim = parseJsonObject('limits_json', row.limits_json);
      const ded = parseJsonObject('deductibles_json', row.deductibles_json);
      if (!cov) fileReport.errors.push({ row: rowId, field: 'coverage_json', message: 'invalid JSON object' });
      if (!lim) fileReport.errors.push({ row: rowId, field: 'limits_json', message: 'invalid JSON object' });
      if (!ded) fileReport.errors.push({ row: rowId, field: 'deductibles_json', message: 'invalid JSON object' });

      // Coverage keys subset check
      if (cov) {
        const keys = Object.keys(cov);
        const extras = keys.filter(k => !(CoverageKeys as readonly string[]).includes(k));
        if (extras.length) fileReport.warnings.push({ row: rowId, field: 'coverage_json', message: `non-canonical keys: ${extras.join(', ')}` });
      }

      // Source URL https
      if (!isHttps(row.source_url)) fileReport.errors.push({ row: rowId, field: 'source_url', message: 'must be https URL' });
    });

    report.files.push(fileReport);
    report.errors += fileReport.errors.length;
    report.warnings += fileReport.warnings.length;
  }

  const outDir = path.join(process.cwd(), 'data', 'audit');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'validate_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(outPath);

  if (report.errors > 0) process.exit(2);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});


