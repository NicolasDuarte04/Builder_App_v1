import { toStoredCategory } from '@/lib/category-alias';
import { telemetry, getUserContext } from '@/lib/telemetry';


async function doFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (res.ok) return res;
  if ([429, 500, 502, 503, 504].includes(res.status)) {
    console.info(`[plans-client] transient ${res.status} → retrying once for`, url);
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
  min_price?: number;
  tags?: string[];
  benefits_contain?: string;
  base?: string;
}) {
  const path = '/api/plans_v2/search';
  const url = opts.base ? new URL(path, opts.base).toString() : path;
  console.info('[plans-client] request', opts, '→', url);

  const body = {
    category: toStoredCategory(opts.category),
    country: opts.country ?? 'CO',
    maxPrice: opts.max_price,
    benefitsContains: typeof opts.benefits_contain === 'string' && opts.benefits_contain.trim()
      ? opts.benefits_contain
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(',')
      : undefined,
    sort: 'price_asc',
    limit: opts.limit ?? 3
  };

  const res = await doFetch(url, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body) 
  });
  // Read server-authoritative normalization headers
  try {
    const normalizedCountHeader = res.headers.get('x-price-normalized-count');
    const originHeader = res.headers.get('x-price-normalized-origin');
    const runKeyHeader = res.headers.get('x-price-normalized-runkey');
    const searchIdHeader = res.headers.get('x-search-id');
    const normalizedCount = normalizedCountHeader != null ? Number(normalizedCountHeader) : undefined;
    if (originHeader === 'server' && runKeyHeader && (Number(normalizedCount) || 0) > 0) {
      // Emit single authoritative event with dedupe key
      try {
        const { sessionId, userId } = await getUserContext();
        telemetry.trackWithDedupe(telemetry.events.PRICE_NORMALIZED, {
          origin: 'server',
          runKey: runKeyHeader,
          searchId: searchIdHeader || undefined,
          normalizedCount,
          sessionId,
          userId,
        }, runKeyHeader);
      } catch {}
    }
  } catch {}

  const data = await res.json();
  const items = Array.isArray(data) ? data : (Array.isArray((data as any)?.items) ? (data as any).items : []);
  console.info('[plans-client] response', { count: items.length });
  return items;
}
