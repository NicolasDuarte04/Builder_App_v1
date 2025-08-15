/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { PlanV2 } from './schema';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const root = process.cwd();
  const jsonPath = path.join(root, 'scripts', 'etl', 'dist', 'plans_v2.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('Missing scripts/etl/dist/plans_v2.json. Run the ETL first.');
    process.exit(1);
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  assert(Array.isArray(data), 'plans_v2.json must be an array');

  const parsed = PlanV2.array().parse(data);

  let usdJustified = 0;
  for (const row of parsed) {
    assert(row.base_price > 0, `base_price must be > 0 for ${row.id}`);
    // 2 decimals max
    const twoDecimals = Math.round(row.base_price * 100) / 100;
    assert(twoDecimals === row.base_price, `base_price must have at most 2 decimals for ${row.id}`);
    assert(isValidUrl(row.external_link), `external_link invalid for ${row.id}`);
    // Currency vs country
    if (row.country === 'CO') {
      assert(row.currency === 'COP' || row.currency === 'USD', `CO rows must be COP or justified USD: ${row.id}`);
    }
    if (row.country === 'MX') {
      assert(row.currency === 'MXN' || row.currency === 'USD', `MX rows must be MXN or justified USD: ${row.id}`);
    }
    if (row.currency === 'USD') usdJustified++;
    // ID length
    assert(row.id.length === 21, `id must be 21 chars (plan_ + 16 hex): ${row.id}`);
  }
  console.log(`Validation OK. Rows: ${parsed.length}. USD rows: ${usdJustified}`);
}

if (require.main === module) {
  main();
}


