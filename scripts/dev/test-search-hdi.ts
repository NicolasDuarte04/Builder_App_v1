/*
  Invoke the Next.js /api/plans_v2/search route directly (no dev server).
  Prints first 3 items for autos and salud (CO).
  Usage: pnpm tsx scripts/dev/test-search-hdi.ts
*/

import { POST as searchPOST } from '../../src/app/api/plans_v2/search/route';

async function call(body: any) {
  const req = new Request('http://local/api/plans_v2/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const res = await searchPOST(req as unknown as Request);
  const json = (await res.json()) as any;
  const items: any[] = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
  return items.slice(0, 3).map((r) => ({ provider: r.provider, name: r.name, category: r.category, country: r.country, benefits_len: Array.isArray(r.benefits) ? r.benefits.length : 0 }));
}

async function main() {
  const autos = await call({ includeCategories: ['autos'], country: 'CO', limit: 3 });
  const salud = await call({ includeCategories: ['salud'], country: 'CO', limit: 3 });
  console.log('autos (first 3):');
  console.log(JSON.stringify(autos, null, 2));
  console.log('salud (first 3):');
  console.log(JSON.stringify(salud, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


