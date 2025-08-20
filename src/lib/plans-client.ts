import { InsurancePlan } from '@/types/project';
import { queryInsurancePlans as localQuery } from './render-db';
import type { AnyPlan, PlanLegacy, PlanV2 } from '@/types/plan';
// DO NOT import fetchSelf at module scope; it pulls in next/headers into client bundles
import { normalizeIncludeExclude, toStoredCategory } from '@/lib/category-alias';

async function doFetch(url: string, init?: RequestInit) {
  const isServer = typeof window === 'undefined';
  if (isServer) {
    const { fetchSelf } = await import('@/lib/server/fetch-self');
    const res = await fetchSelf(url, init);
    if (res.ok) return res;
    if ([429, 500, 502, 503, 504].includes(res.status)) {
      await new Promise(r => setTimeout(r, 200));
      const res2 = await fetchSelf(url, init);
      if (res2.ok) return res2;
      console.error('[plans-client] error body', await res2.text());
      throw new Error(`plans fetch failed: ${res2.status}`);
    }
    console.error('[plans-client] error body', await res.text());
    throw new Error(`plans fetch failed: ${res.status}`);
  }
  // Client-side: use native fetch
  const res = await fetch(url, init);
  if (res.ok) return res;
  if ([429, 500, 502, 503, 504].includes(res.status)) {
    await new Promise(r => setTimeout(r, 200));
    const res2 = await fetch(url, init);
    if (res2.ok) return res2;
    console.error('[plans-client] error body', await res2.text());
    throw new Error(`plans fetch failed: ${res2.status}`);
  }
  console.error('[plans-client] error body', await res.text());
  throw new Error(`plans fetch failed: ${res.status}`);
}

export async function searchPlans(opts: {
  includeCategories?: string[];
  excludeCategories?: string[];
  category?: string | null;
  country?: string;
  limit?: number;
  // tolerated extras (used by callers); forwarded when meaningful
  max_price?: number;
  tags?: string[];
  benefits_contain?: string;
}) {
  const include = (opts.includeCategories ?? (opts.category ? [opts.category] : [])).filter(Boolean);
  const params = new URLSearchParams();
  if (include.length) params.set('includeCategories', include.join(','));
  params.set('country', (opts.country || 'CO').toUpperCase());
  params.set('limit', String(opts.limit ?? 12));

  const url = `/api/plans_v2/search?${params.toString()}`;
  console.info('[plans-client] request', Object.fromEntries(params), '→', url);

  const body: any = { includeCategories: include, country: opts.country };
  if (Array.isArray(opts.tags) && opts.tags.length) body.tags = opts.tags;
  // benefits_contain is not supported by v2 API directly; omit or map to q in the future if needed

  const res = await doFetch(url, { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  console.info('[plans-client] response', { count: Array.isArray(data) ? data.length : data?.length ?? 0 });
  return data;
}
