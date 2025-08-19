/*
  Small helper to invoke the Next.js route handlers without running the dev server.
  Usage:
    npx tsx scripts/dev/test-search.ts
*/

import { POST as searchPOST } from '../../src/app/api/plans_v2/search/route';

async function call(body: any) {
  const req = new Request('http://local/api/plans_v2/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const res = await searchPOST(req as unknown as Request);
  const json = (await res.json()) as any[];
  return json.map((r) => ({ provider: r.provider, name: r.name, category: r.category, country: r.country }));
}

async function main() {
  const a = await call({ includeCategories: ['educacion'], country: 'CO', limit: 5 });
  const b = await call({ includeCategories: ['educativa'], country: 'CO', limit: 5 });
  console.log('educacion sample:', a.slice(0, 3));
  console.log('educativa sample:', b.slice(0, 3));
  console.log('counts', { educacion: a.length, educativa: b.length });
  const providersA = new Set(a.map((r) => r.provider));
  const providersB = new Set(b.map((r) => r.provider));
  console.log('providersEqual', providersA.size === providersB.size && [...providersA].every((p) => providersB.has(p)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


