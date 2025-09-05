import { NextResponse } from 'next/server';
import { pool, hasDatabaseUrl } from '@/lib/render-db';
import { normalizeIncludeExclude, normalizeList, normalizeCategory } from '@/lib/category-alias';
import { getDomainFromRequest } from '@/lib/server/base-url';
import { writeReport } from '@/lib/observability/reports';
import { FLAGS } from '@/lib/flags';
import { normalizeCarrier } from '@/lib/catalog/normalize';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const start = Date.now();
  const requestId = Math.random().toString(36).slice(2, 7);
  const body = await req.json().catch(() => ({}));
  
  // TODO: feature flag scaffolding for ranking tweaks
  // import { FLAGS } from '@/lib/flags';
  // if (FLAGS.newSearchRanking) { /* apply scoring tweaks in future */ }
  
  // Support both single & list, normalize on the server too
  let include = normalizeList(body.includeCategories || body.include || []);
  if (!include.length && body.category) include = [normalizeCategory(body.category)!];

  const country = (body.country || "CO").toUpperCase();
  const limit = Math.min(Number(body.limit || 12), 50);
  const excludeCategories = body.excludeCategories || [];
  const tags = body.tags || [];
  const q = body.q || '';
  // Optional filters (provider & price window) honored if present
  const providerRaw: string | undefined = body.provider || body.providerName || undefined;
  const minPrice: number | undefined = body.minPrice != null ? Number(body.minPrice) : undefined;
  const maxPrice: number | undefined = body.maxPrice != null ? Number(body.maxPrice) : undefined;

  const includeNorm = normalizeIncludeExclude(include);
  const excludeNorm = normalizeIncludeExclude(excludeCategories);

  const where: string[] = ['1=1'];
  const params: any[] = [];
  let i = 1;

  if (country) {
    where.push(`country = $${i++}`);
    params.push(country);
  }
  if (Array.isArray(includeNorm) && includeNorm.length > 0) {
    where.push(`category = ANY($${i++}::text[])`);
    params.push(includeNorm);
  }
  if (Array.isArray(excludeNorm) && excludeNorm.length > 0) {
    where.push(`NOT (category = ANY($${i++}::text[]))`);
    params.push(excludeNorm);
  }
  if (Array.isArray(tags) && tags.length > 0) {
    where.push(`tags @> $${i++}::jsonb`);
    params.push(JSON.stringify(tags));
  }
  if (q && typeof q === 'string' && q.trim()) {
    where.push(`(name ILIKE $${i} OR COALESCE(name_en,'') ILIKE $${i} OR provider ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (providerRaw && typeof providerRaw === 'string' && providerRaw.trim()) {
    const canonical = normalizeCarrier(providerRaw.trim());
    where.push(`provider = $${i++}`);
    params.push(canonical);
  }
  if (typeof minPrice === 'number' && Number.isFinite(minPrice)) {
    where.push(`base_price >= $${i++}`);
    params.push(minPrice);
  }
  if (typeof maxPrice === 'number' && Number.isFinite(maxPrice)) {
    where.push(`base_price <= $${i++}`);
    params.push(maxPrice);
  }
  // Benefits filter (CSV terms; case-insensitive contains on any benefit string)
  const benefitsContainsRaw = Array.isArray((body as any)?.benefitsContains)
    ? (body as any).benefitsContains
    : (typeof (body as any)?.benefitsContains === 'string' ? String((body as any).benefitsContains) : undefined);
  if (benefitsContainsRaw) {
    const terms = (Array.isArray(benefitsContainsRaw) ? benefitsContainsRaw : String(benefitsContainsRaw).split(','))
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (terms.length > 0) {
      where.push(`EXISTS (SELECT 1 FROM jsonb_array_elements_text(benefits) btxt WHERE btxt ILIKE ANY($${i++}::text[]))`);
      params.push(terms.map((t: string) => `%${t}%`));
    }
  }
  // Do NOT filter out quote-only or missing-price plans. The UI handles placeholder display.

  let rows: any[] = [];
  if (pool && hasDatabaseUrl) {
    // Default sort: price ascending (can be overridden via body.sort = 'price_desc' | 'name')
    const sortRaw = (body as any)?.sort || 'price_asc';
    let orderBy = 'base_price ASC';
    if (typeof sortRaw === 'string') {
      const s = sortRaw.toLowerCase();
      if (s === 'price_desc') orderBy = 'base_price DESC';
      else if (s === 'name_asc') orderBy = 'provider ASC, name ASC';
    }
    const sql = `SELECT id, provider, name, name_en, category, country, base_price, currency, external_link, brochure_link, benefits, benefits_en, tags
                 FROM public.plans_v2
                 WHERE ${where.join(' AND ')}
                 ORDER BY ${orderBy}
                 LIMIT $${i}`;
    params.push(Math.min(Number(limit) || 20, 100));

    const res = await pool.query(sql, params);
    rows = res.rows;
  }

  try {
    console.info('[plans_v2/search]', {
      includeCategories: includeNorm,
      country: country || null,
      count: Array.isArray(rows) ? rows.length : 0,
      runtime: process.env.NEXT_RUNTIME || 'nodejs',
      limit,
    });
  } catch {}

  if (process.env.LOG_THIN_RESULTS === 'true') {
    const durationMs = Date.now() - start;
    const domain = getDomainFromRequest(req);
    const datasource = process.env.BRIKI_DATA_SOURCE || null;
    const event = {
      timestamp: new Date(start).toISOString(),
      domain,
      datasource,
      country,
      includeCategories: Array.isArray(includeNorm) ? includeNorm : [],
      excludeCategories: Array.isArray(excludeNorm) ? excludeNorm : [],
      tags: Array.isArray(tags) ? tags : [],
      benefitsContain: typeof (body?.benefitsContain) === 'string' ? body.benefitsContain : undefined,
      count: Array.isArray(rows) ? rows.length : 0,
      durationMs,
      requestId,
    };
    if (event.count === 0 || event.count < 3) {
      // fire-and-forget, swallow errors
      Promise.resolve(writeReport(event as any)).catch(() => {});
    }
  }

  // DB-first: query Postgres; only if it yields 0 rows (or DB unavailable), use bundled JSON fallback
  if (!Array.isArray(rows) || rows.length === 0) {
    try {
      // Use a bundled import so the dataset is packaged with the serverless function
      const dataModule: any = await import('../../../../../scripts/etl/dist/plans_v2.json');
      const data = dataModule?.default || dataModule;
      const lc = (s: any) => String(s || '').toLowerCase();
      const includeSet = new Set((includeNorm || []).map((c: string) => lc(c)));
      const excludeSet = new Set((excludeNorm || []).map((c: string) => lc(c)));
      let filtered = (Array.isArray(data) ? data : []);
      if (includeSet.size > 0) {
        filtered = filtered.filter((r: any) => includeSet.has(lc(r.category)));
      }
      if (excludeSet.size > 0) {
        filtered = filtered.filter((r: any) => !excludeSet.has(lc(r.category)));
      }
      if (country) {
        filtered = filtered.filter((r: any) => lc(r.country) === lc(country));
      }
      if (Array.isArray(tags) && tags.length > 0) {
        const tagSet = new Set(tags.map((t: any) => lc(t)));
        filtered = filtered.filter((r: any) => Array.isArray(r.tags) && r.tags.some((t: any) => tagSet.has(lc(t))));
      }
      if (q && typeof q === 'string' && q.trim()) {
        const needle = lc(q);
        filtered = filtered.filter((r: any) => lc(r.name).includes(needle) || lc(r.name_en || '').includes(needle) || lc(r.provider).includes(needle));
      }
      const limited = filtered.slice(0, Math.min(Number(limit) || 20, 100));
      try {
        console.info('[plans_v2/search:fallback]', { includeCategories: includeNorm, country: country || null, count: limited.length });
      } catch {}
      return NextResponse.json(limited, { status: 200 });
    } catch (e) {
      try { console.error('[plans_v2/search:fallback] failed', e); } catch {}
    }
  }

  // Lightweight relevance tweak (flagged): boost matches by intent keywords vs plan tags
  try {
    if (Array.isArray(rows) && rows.length > 0 && FLAGS.newSearchRanking) {
      const needle = String(q || '').toLowerCase();
      const want = new Set<string>([]);
      if (/(grua|grúa|asistencia)/.test(needle)) want.add('asistencia vial');
      if (/(robo|hurto)/.test(needle)) want.add('robo total');
      if (/(rc|responsabilidad\s*civil)/.test(needle)) want.add('responsabilidad civil');
      const scored = rows.map((r: any, idx: number) => {
        const tagsArr = Array.isArray(r.tags) ? r.tags.map((t: any) => String(t).toLowerCase()) : [];
        let boost = 0;
        want.forEach((k) => { if (tagsArr.includes(k)) boost += 1; });
        return { r, s: boost, i: idx };
      });
      scored.sort((a, b) => (b.s - a.s) || (a.i - b.i));
      rows = scored.map((x) => x.r);
    }
  } catch {}

  return NextResponse.json(rows, { status: 200 });
}

export async function GET(req: Request) {
  // allow querystring too
  const url = new URL(req.url);
  const country = url.searchParams.get('country') || undefined;
  const includeCategories = url.searchParams.getAll('includeCategories');
  const excludeCategories = url.searchParams.getAll('excludeCategories');
  const tags = url.searchParams.getAll('tags');
  const q = url.searchParams.get('q') || '';
  const provider = url.searchParams.get('provider') || undefined;
  const minPrice = url.searchParams.get('minPrice');
  const maxPrice = url.searchParams.get('maxPrice');
  const benefitsContains = url.searchParams.get('benefitsContains') || undefined;
  const sort = url.searchParams.get('sort') || 'price_asc';
  const limit = Number(url.searchParams.get('limit') || '20');
  return POST(new Request(req.url, { method: 'POST', body: JSON.stringify({ country, includeCategories, excludeCategories, tags, q, provider, minPrice, maxPrice, benefitsContains, sort, limit }) }));
}


