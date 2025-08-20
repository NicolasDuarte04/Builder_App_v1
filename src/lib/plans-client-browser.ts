export async function searchPlans(opts: {
  includeCategories?: string[];
  excludeCategories?: string[];
  category?: string | null;
  country?: string;
  limit?: number;
  tags?: string[];
  benefits_contain?: string;
}) {
  const include = (opts.includeCategories ?? (opts.category ? [opts.category] : [])).filter(Boolean);
  const params = new URLSearchParams();
  if (include.length) params.set('includeCategories', include.join(','));
  params.set('country', (opts.country || 'CO').toUpperCase());
  params.set('limit', String(opts.limit ?? 12));

  const url = `/api/plans_v2/search?${params.toString()}`;
  console.info('[plans-client:browser] request', Object.fromEntries(params), '→', url);

  const body: any = { includeCategories: include, country: opts.country };
  if (Array.isArray(opts.tags) && opts.tags.length) body.tags = opts.tags;

  const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`plans fetch failed: ${res.status}`);
  const data = await res.json();
  console.info('[plans-client:browser] response', { count: Array.isArray(data) ? data.length : data?.length ?? 0 });
  return data;
}
