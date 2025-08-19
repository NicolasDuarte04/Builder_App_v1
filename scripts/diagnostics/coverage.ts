/*
  Diagnostics: plans_v2 coverage and runtime checks
  - Read-only queries against DATABASE_URL
  - Writes reports to /reports
*/
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function main() {
  const outDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = nowStamp();
  const csvPath = path.join(outDir, `plans_coverage_${stamp}.csv`);
  const mdPath = path.join(outDir, `plans_coverage_${stamp}.md`);
  const runtimeMdPath = path.join(outDir, `runtime_findings_${stamp}.md`);
  const actionMdPath = path.join(outDir, `action_items_${stamp}.md`);

  const conn = process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL;
  if (!conn) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Basic checks
  const total = await client.query('SELECT COUNT(*)::int AS c FROM public.plans_v2');
  const byCat = await client.query(`SELECT category, COUNT(*)::int AS cnt FROM public.plans_v2 GROUP BY 1 ORDER BY cnt DESC, category`);
  const topProviders = await client.query(`SELECT provider, COUNT(*)::int AS cnt FROM public.plans_v2 GROUP BY 1 ORDER BY cnt DESC NULLS LAST LIMIT 15`);
  const byCountry = await client.query(`SELECT COALESCE(country,'(null)') AS country, COUNT(*)::int AS cnt FROM public.plans_v2 GROUP BY 1 ORDER BY 2 DESC`);
  const byCurrency = await client.query(`SELECT COALESCE(currency,'(null)') AS currency, COUNT(*)::int AS cnt FROM public.plans_v2 GROUP BY 1 ORDER BY 2 DESC`);
  const priceQuality = await client.query(`SELECT SUM(CASE WHEN base_price IS NULL THEN 1 ELSE 0 END)::int AS price_null, SUM(CASE WHEN base_price = 0 THEN 1 ELSE 0 END)::int AS price_zero FROM public.plans_v2`);
  const linkQuality = await client.query(`SELECT SUM(CASE WHEN external_link IS NULL OR external_link = '' THEN 1 ELSE 0 END)::int AS external_link_missing, SUM(CASE WHEN brochure_link IS NULL OR brochure_link = '' THEN 1 ELSE 0 END)::int AS brochure_link_missing FROM public.plans_v2`);
  // benefits/tags are stored as JSONB arrays; use jsonb_array_length
  const signal = await client.query(`SELECT 
    SUM(CASE WHEN benefits IS NULL OR jsonb_array_length(benefits) = 0 THEN 1 ELSE 0 END)::int AS benefits_empty,
    SUM(CASE WHEN tags IS NULL OR jsonb_array_length(tags) = 0 THEN 1 ELSE 0 END)::int AS tags_empty
  FROM public.plans_v2`);

  // Category deep dive for auto
  const autoCount = await client.query(`SELECT COUNT(*)::int AS c FROM public.plans_v2 WHERE category='auto'`);
  const autoSample = await client.query(`SELECT id, name, provider, base_price, currency, external_link FROM public.plans_v2 WHERE category='auto' ORDER BY base_price NULLS LAST, name LIMIT 25`);
  const invalids = await client.query(`SELECT id, name, provider, category, base_price, external_link FROM public.plans_v2 WHERE (external_link IS NULL OR external_link='') OR (base_price IS NULL) OR (benefits IS NULL OR jsonb_array_length(benefits)=0)`);

  // CSV export of all rows
  const allRows = await client.query(`SELECT id, name, provider, category, base_price, currency, country, external_link, brochure_link, 
    COALESCE(jsonb_array_length(tags),0) AS tags_count, COALESCE(jsonb_array_length(benefits),0) AS benefits_count 
    FROM public.plans_v2 ORDER BY provider, name`);
  const csvHeader = 'id,name,provider,category,base_price,currency,country,has_external_link,has_brochure_link,tags_count,benefits_count\n';
  const csvBody = allRows.rows
    .map(r => [
      r.id,
      JSON.stringify(r.name),
      JSON.stringify(r.provider),
      r.category,
      r.base_price,
      r.currency,
      r.country,
      r.external_link && r.external_link !== '' ? 1 : 0,
      r.brochure_link && r.brochure_link !== '' ? 1 : 0,
      r.tags_count || 0,
      r.benefits_count || 0,
    ].join(','))
    .join('\n');
  fs.writeFileSync(csvPath, csvHeader + csvBody, 'utf8');

  // Markdown summary
  const lowCatThreshold = 6;
  const lowCats = byCat.rows.filter(r => r.cnt < lowCatThreshold);
  const md = [
    `# Plans Coverage (${stamp})`,
    `- Total: ${total.rows[0].c}`,
    `- Categories:`,
    ...byCat.rows.map(r => `  - ${r.category}: ${r.cnt}`),
    `- Top providers:`,
    ...topProviders.rows.map(r => `  - ${r.provider}: ${r.cnt}`),
    `- Country distribution:`,
    ...byCountry.rows.map(r => `  - ${r.country}: ${r.cnt}`),
    `- Currency distribution:`,
    ...byCurrency.rows.map(r => `  - ${r.currency}: ${r.cnt}`),
    `- Pricing quality: null=${priceQuality.rows[0].price_null}, zero=${priceQuality.rows[0].price_zero}`,
    `- Link quality: external_link_missing=${linkQuality.rows[0].external_link_missing}, brochure_link_missing=${linkQuality.rows[0].brochure_link_missing}`,
    `- Signal quality: benefits_empty=${signal.rows[0].benefits_empty}, tags_empty=${signal.rows[0].tags_empty}`,
    `\n## Auto deep-dive`,
    `- Count: ${autoCount.rows[0].c}`,
    `- Sample:`,
    ...autoSample.rows.map(r => `  - ${r.provider} • ${r.name} • ${r.base_price ?? 'null'} ${r.currency ?? ''} • link=${r.external_link ? 'yes' : 'no'}`),
    `\n## Potential invalids (missing link/price/benefits) — ${invalids.rows.length} rows`,
    ...invalids.rows.slice(0, 50).map(r => `  - ${r.category} • ${r.provider} • ${r.name} • price=${r.base_price ?? 'null'} • link=${r.external_link ? 'yes' : 'no'}`),
  ].join('\n');
  fs.writeFileSync(mdPath, md, 'utf8');

  // Runtime/API probe (no logs access here)
  const base = 'https://www.brikiapp.com';
  const fetchJson = async (url: string) => {
    try { const res = await fetch(url, { cache: 'no-store' }); return await res.json(); } catch (e: any) { return { error: String(e?.message || e) }; }
  };
  const envDiag = await fetchJson(`${base}/api/env/diag`);
  const v2Diag = await fetchJson(`${base}/api/plans_v2/diag`);
  const sAuto = await fetchJson(`${base}/api/plans_v2/search?includeCategories=auto&limit=5`);
  const sVida = await fetchJson(`${base}/api/plans_v2/search?includeCategories=vida&limit=5`);
  const sSalud = await fetchJson(`${base}/api/plans_v2/search?includeCategories=salud&limit=5`);
  const runtimeMd = [
    `# Runtime findings (${stamp})`,
    `- /api/env/diag: ${JSON.stringify(envDiag)}`,
    `- /api/plans_v2/diag: counts=${v2Diag?.counts} has_table=${v2Diag?.has_table} datasource=${v2Diag?.datasourceDetected}`,
    `- Search auto len=${Array.isArray(sAuto) ? sAuto.length : 'err'}`,
    `- Search vida len=${Array.isArray(sVida) ? sVida.length : 'err'}`,
    `- Search salud len=${Array.isArray(sSalud) ? sSalud.length : 'err'}`,
    `\nNote: Vercel runtime log aggregation requires Vercel CLI auth; unique error counts not collected here.`,
  ].join('\n');
  fs.writeFileSync(runtimeMdPath, runtimeMd, 'utf8');

  // Action items (simple heuristics)
  const categoryMap: Record<string, number> = Object.fromEntries(byCat.rows.map(r => [r.category, r.cnt]));
  const gaps = Object.entries(categoryMap).filter(([, c]) => c < lowCatThreshold).sort((a,b)=>a[1]-b[1]);
  const actionMd = [
    `# Action items (${stamp})`,
    `## Coverage gaps (threshold < ${lowCatThreshold})`,
    ...gaps.map(([cat, cnt]) => `- ${cat}: ${cnt} plans → add ${lowCatThreshold - cnt}+`),
    `\n## Data quality`,
    `- ${priceQuality.rows[0].price_null} plans with null price; ${priceQuality.rows[0].price_zero} with zero price`,
    `- ${linkQuality.rows[0].external_link_missing} plans missing external_link; ${linkQuality.rows[0].brochure_link_missing} missing brochure_link`,
    `- ${signal.rows[0].benefits_empty} plans with empty benefits; ${signal.rows[0].tags_empty} with empty tags`,
    `\n## Prioritization suggestions`,
    `- Boost categories with lowest counts first (e.g., auto, hogar, otros if under threshold).`,
    `- Focus on top providers for those categories (from coverage.md top list).`,
    `- Ensure external_link present and benefits populated for all newly added plans.`,
  ].join('\n');
  fs.writeFileSync(actionMdPath, actionMd, 'utf8');

  await client.end();

  // Console summary
  console.log('Coverage summary:', { total: total.rows[0].c, byCategory: byCat.rows });
  console.log('Reports written:', { csvPath, mdPath, runtimeMdPath, actionMdPath });
}

main().catch((e) => {
  console.error('Diagnostics failed', e);
  process.exit(1);
});


