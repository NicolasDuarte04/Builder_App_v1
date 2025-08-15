/* eslint-disable no-console */
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL;
  if (!url) {
    console.error('DATABASE_URL/RENDER_POSTGRES_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows: cntRows } = await client.query('SELECT COUNT(*)::int AS c FROM public.plans_v2');
    const count = cntRows[0]?.c || 0;
    console.log('[v2] count:', count);
    if (count <= 0) throw new Error('plans_v2 has zero rows');

    const { rows: minmax } = await client.query('SELECT MIN(base_price)::float AS min, MAX(base_price)::float AS max FROM public.plans_v2');
    console.log('[v2] min/max base_price:', minmax[0]);
    if ((minmax[0]?.min || 0) <= 0) throw new Error('base_price min must be > 0');

    const { rows: badCurrency } = await client.query("SELECT COUNT(*)::int AS c FROM public.plans_v2 WHERE currency NOT IN ('COP','MXN','EUR','USD')");
    if (badCurrency[0]?.c > 0) throw new Error('Invalid currency values present');

    const { rows: nullLinks } = await client.query('SELECT COUNT(*)::int AS c FROM public.plans_v2 WHERE external_link IS NULL OR external_link = ''''');
    if (nullLinks[0]?.c > 0) throw new Error('Null/empty external_link present');

    const { rows: badBenefits } = await client.query("SELECT COUNT(*)::int AS c FROM public.plans_v2 WHERE jsonb_typeof(benefits) <> 'array' OR jsonb_typeof(benefits_en) <> 'array'");
    if (badBenefits[0]?.c > 0) throw new Error('benefits or benefits_en are not JSON arrays');

    const { rows: samples } = await client.query('SELECT id, provider, brochure_link FROM public.plans_v2 WHERE brochure_link IS NOT NULL LIMIT 3');
    console.log('[v2] samples with brochure_link:', samples);

    const { rows: breakdown } = await client.query('SELECT country, category, COUNT(*)::int AS c FROM public.plans_v2 GROUP BY country, category ORDER BY country, category');
    console.log('[v2] breakdown:', breakdown);

    console.log('OK');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('verify failed:', e);
  process.exit(1);
});


