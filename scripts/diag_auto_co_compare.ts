#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function main() {
  const pattern = process.argv[2] || 'data/seed/batches/auto_CO_*.csv';
  const latest = fs.readdirSync(path.dirname(pattern.replace('*','X')))
    .filter(f => /^auto_CO_.*\.csv$/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join('data/seed/batches', f)).mtimeMs }))
    .sort((a,b)=>b.t-a.t)[0]?.f;
  if (!latest) throw new Error('No auto_CO CSV batch found');
  const csvPath = path.join('data/seed/batches', latest);

  const csvText = fs.readFileSync(csvPath, 'utf8').trim();
  const [header, ...rows] = csvText.split(/\r?\n/);
  const cols = header.split(',');
  const idx: Record<string, number> = Object.fromEntries(cols.map((c,i)=>[c,i]));

  function val(r: string[], k: string) { return r[idx[k]] ?? ''; }

  const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const priceMismatches: string[] = ['id,provider,name,csv_price,db_price'];
  const benefitsMismatches: string[] = ['id,provider,name,csv_has_benefits,db_benefit_count'];

  for (const line of rows) {
    const r = line.split(',');
    const product = val(r,'product');
    const country = val(r,'country');
    if (!(product==='auto' && country==='CO')) continue;
    const provider = val(r,'carrier_name');
    const name = val(r,'plan_name');
    const price = Number(val(r,'premium_amount_month'));
    const tags = val(r,'tags');
    const id = `stage_${require('crypto').createHash('md5').update(`${product}|${country}|${provider}|${name}|${(val(r,'variant')||'standard')}`).digest('hex')}`;
    const q = await client.query(`SELECT provider,name,base_price,COALESCE(jsonb_array_length(benefits),0) AS bcnt FROM plans_v2 WHERE id=$1`, [id]);
    if (q.rows.length === 1) {
      const db = q.rows[0];
      if (Number(db.base_price) !== price) priceMismatches.push([id, db.provider, db.name, String(price), String(db.base_price)].join(','));
      const csvHasBenefits = '[]' !== '[]' && tags.length>0 ? 1 : 0; // CSV had only tags; benefits were not in CSV
      if (csvHasBenefits && Number(db.bcnt) === 0) benefitsMismatches.push([id, db.provider, db.name, String(csvHasBenefits), String(db.bcnt)].join(','));
    }
  }

  fs.writeFileSync('data/audit/diag_auto_CO_mismatch_price.csv', priceMismatches.join('\n'));
  fs.writeFileSync('data/audit/diag_auto_CO_mismatch_benefits.csv', benefitsMismatches.join('\n'));
  await client.end();
  console.log('written mismatches');
}

main().catch(e=>{ console.error(e); process.exit(1); });


