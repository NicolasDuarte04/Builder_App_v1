/*
  Report HDI exposure via public.plans_v2 (DB) and /api/plans_v2/search (route).
  Usage:
    node --env-file=.env.local --require dotenv/config --import tsx ./scripts/dev/report-hdi.ts
*/

import { q } from '../../src/lib/db-catalog';
import { POST as searchPOST } from '../../src/app/api/plans_v2/search/route';

async function dbCountsByCategory() {
  const rows = await q<{ category: string; count: number }>(
    `select category, count(*)::int as count
     from public.plans_v2
     where provider ilike 'HDI%'
     group by category
     order by category`
  );
  return rows;
}

async function dbSpotChecks(category: 'autos' | 'salud') {
  const rows = await q<{ id: string; provider: string; name: string; category: string; benefits_len: number }>(
    `select id, provider, name, category, coalesce(jsonb_array_length(benefits),0) as benefits_len
     from public.plans_v2
     where provider ilike 'HDI%'
       and category = $1
       and coalesce(jsonb_array_length(benefits),0) >= 4
     order by name
     limit 2`,
    [category]
  );
  return rows;
}

async function searchExcerpts(category: 'autos' | 'salud') {
  const req = new Request('http://local/api/plans_v2/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ includeCategories: [category], country: 'CO', q: 'HDI', limit: 3 }),
  });
  const res = await searchPOST(req as unknown as Request);
  const json: any = await res.json();
  const items: any[] = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
  return items.slice(0, 3).map((r) => ({ provider: r.provider, name: r.name, category: r.category, benefits_len: Array.isArray(r.benefits) ? r.benefits.length : 0 }));
}

async function main() {
  const counts = await dbCountsByCategory();
  const autosChecks = await dbSpotChecks('autos');
  const saludChecks = await dbSpotChecks('salud');
  const autosSearch = await searchExcerpts('autos');
  const saludSearch = await searchExcerpts('salud');

  const payload = {
    counts,
    spotChecks: { autos: autosChecks, salud: saludChecks },
    apiExcerpts: { autos: autosSearch, salud: saludSearch },
  };
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


