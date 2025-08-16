/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

type V2 = {
  id: string;
  name: string;
  name_en?: string | null;
  provider: string;
  category: string;
  country: string;
  base_price: number;
  currency: string;
  external_link: string;
  brochure_link?: string | null;
  benefits?: string[];
  benefits_en?: string[];
  tags?: string[];
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const root = process.cwd();
  const jsonPath = path.join(root, 'scripts', 'etl', 'dist', 'plans_v2.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Missing ${jsonPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  const rows: V2[] = Array.isArray(parsed) ? parsed : parsed?.rows || parsed?.data || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('❌ No rows in JSON');
    process.exit(1);
  }

  const url = process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL;
  if (!url) {
    console.error('❌ DATABASE_URL/RENDER_POSTGRES_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const insertHeader = `
  INSERT INTO public.insurance_plans
  (id, name, provider, category, country, base_price, currency, external_link, brochure_link, benefits, tags)
  VALUES `;
  const conflictClause = ` ON CONFLICT (id) DO UPDATE SET
    name=EXCLUDED.name,
    provider=EXCLUDED.provider,
    category=EXCLUDED.category,
    country=EXCLUDED.country,
    base_price=EXCLUDED.base_price,
    currency=EXCLUDED.currency,
    external_link=EXCLUDED.external_link,
    brochure_link=EXCLUDED.brochure_link,
    benefits=EXCLUDED.benefits,
    tags=EXCLUDED.tags`;

  let skipped = 0;
  let inserted = 0;
  let updated = 0;

  await client.query('BEGIN');

  // Determine numeric id start if id column is integer
  const maxIdRes = await client.query('SELECT COALESCE(MAX(id),0) AS max FROM public.insurance_plans');
  let nextId: number = Number(maxIdRes.rows[0]?.max || 0) + 1;

  const mapped = rows.map((r) => {
    const priceNum = Number(r.base_price);
    const validPrice = isFinite(priceNum) ? Math.round(priceNum) : 0;
    const benefits = Array.isArray(r.benefits) ? r.benefits : [];
    const tags = Array.isArray(r.tags) ? r.tags : [];
    const anyRow: any = r as any;
    return {
      id: nextId++,
      name: String(r.name),
      provider: String(r.provider),
      category: String(r.category),
      country: String(r.country),
      base_price: validPrice,
      currency: String(r.currency || ''),
      external_link: String(r.external_link || ''),
      brochure_link: (anyRow.brochure_link ?? anyRow.brochure ?? null) as string | null,
      benefits,
      tags,
    };
  });

  const filtered = mapped.filter((m) => {
    const ok = m.base_price > 0 && m.currency && m.external_link;
    if (!ok) skipped++;
    return ok;
  });

  // Row-by-row update-or-insert to preserve existing IDs based on (provider,name)
  for (const g of filtered) {
    const upd = await client.query(
      `UPDATE public.insurance_plans SET
        category=$1,
        country=$2,
        base_price=$3,
        currency=$4,
        external_link=$5,
        brochure_link=$6,
        benefits=$7::jsonb,
        tags=$8::jsonb
       WHERE provider=$9 AND name=$10`,
      [
        g.category,
        g.country,
        g.base_price,
        g.currency,
        g.external_link,
        g.brochure_link,
        JSON.stringify(g.benefits),
        JSON.stringify(g.tags),
        g.provider,
        g.name,
      ]
    );
    if (upd.rowCount && upd.rowCount > 0) {
      updated += upd.rowCount;
      continue;
    }
    // Insert new row with a fresh integer id
    await client.query(
      `${insertHeader}($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [
        g.id,
        g.name,
        g.provider,
        g.category,
        g.country,
        g.base_price,
        g.currency,
        g.external_link,
        g.brochure_link,
        JSON.stringify(g.benefits),
        JSON.stringify(g.tags),
      ]
    );
    inserted += 1;
  }

  await client.query('COMMIT');
  console.log('Updated:', updated, 'Inserted:', inserted, 'Skipped (<=0 price or missing fields):', skipped);

  const sample = await client.query(
    `SELECT id, provider, name, base_price, currency FROM public.insurance_plans ORDER BY provider, name LIMIT 3`
  );
  console.log('Sample:', sample.rows);

  await client.end();
}

main().catch((e) => {
  console.error('Loader failed:', e);
  process.exit(1);
});


