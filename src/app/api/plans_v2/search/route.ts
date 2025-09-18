import { NextResponse } from 'next/server';
import { normalizeIncludeExclude, normalizeList, normalizeCategory } from '@/lib/category-alias';
import { getDomainFromRequest } from '@/lib/server/base-url';
import { writeReport } from '@/lib/observability/reports';
import { FLAGS } from '@/lib/flags';
import { normalizePriceToCOP } from '@/lib/currency-normalization';
import { normalizeCarrier } from '@/lib/catalog/normalize';
import { createHash } from 'crypto';
import { telemetry } from '@/lib/telemetry';
import { env, getServerVar } from '@/lib/env';

export const runtime = 'nodejs';

// currency normalization logic moved to '@/lib/currency-normalization' for reuse

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
  // Determine catalog DB env used (RO preferred) without importing the client unless present
  const catalogRo = env.server.CATALOG_DB_RO_URL || getServerVar('CATALOG_DB_RO_URL');
  const catalogRw = env.server.CATALOG_DB_URL || getServerVar('CATALOG_DB_URL');
  const usingEnv = catalogRo ? 'CATALOG_DB_RO_URL' : (catalogRw ? 'CATALOG_DB_URL' : null);
  const hasCatalogDb = Boolean(usingEnv);
  let metaInfo: { db: string | null; sch: string | null } = { db: null, sch: null };
  let catalogTableExists = false;
  let usedCatalog = false;

  if (hasCatalogDb) {
    // Import lazily to avoid throwing when envs are missing
    const { q } = await import('@/lib/db-catalog');

    // Log which env is active in development
    try { if (env.server.NODE_ENV !== 'production') console.info('[plans_v2/search] using', usingEnv); } catch {}

    // Self-test: verify plans_v2 exists before issuing the main query, and capture db/schema
    try {
      const metaRows = await q<{ reg: string | null; db: string | null; sch: string | null }>(
        `select to_regclass('public.plans_v2') as reg, current_database() as db, current_schema() as sch`
      );
      const metaRow = metaRows?.[0] || ({} as any);
      const reg = metaRow?.reg ?? null;
      metaInfo = { db: metaRow?.db || null, sch: metaRow?.sch || null };
      if (!reg) {
        console.warn('[plans_v2/search:selftest] catalog table missing', {
          using: usingEnv,
          db: metaInfo?.db || null,
          schema: metaInfo?.sch || null,
          missing: 'public.plans_v2',
        });
        const fallbackResp = await buildFallbackResponse({
          body, includeNorm, excludeNorm, tags, q, limit, country
        });
        try {
          fallbackResp.headers.set('x-catalog-degraded', 'true');
          fallbackResp.headers.set('x-catalog-source', 'fallback');
          fallbackResp.headers.set('x-catalog-using', usingEnv || 'none');
          fallbackResp.headers.set('x-catalog-db', metaInfo?.db || '');
          fallbackResp.headers.set('x-catalog-schema', metaInfo?.sch || '');
        } catch {}
        return fallbackResp;
      } else {
        catalogTableExists = true;
        console.info('[plans_v2/search:selftest] catalog check ok', {
          using: usingEnv,
          db: metaInfo?.db || null,
          schema: metaInfo?.sch || null,
          plans_v2_exists: true,
        });
      }
    } catch (e: any) {
      const transientCode = getTransientErrorCode(e);
      if (transientCode) {
        try { telemetry.track('catalog.error', { provider: 'render', code: transientCode }); } catch {}
        await sleep(100 + Math.floor(Math.random() * 101));
        try {
          const metaRows2 = await q<{ reg: string | null; db: string | null; sch: string | null }>(
            `select to_regclass('public.plans_v2') as reg, current_database() as db, current_schema() as sch`
          );
          const meta2 = metaRows2?.[0] || ({} as any);
          const reg2 = meta2?.reg ?? null;
          if (!reg2) {
            const fb = await buildFallbackResponse({ body, includeNorm, excludeNorm, tags, q, limit, country });
            try {
              fb.headers.set('x-catalog-degraded', 'true');
              fb.headers.set('x-catalog-source', 'fallback');
              fb.headers.set('x-catalog-using', usingEnv || 'none');
              fb.headers.set('x-catalog-db', meta2?.db || '');
              fb.headers.set('x-catalog-schema', meta2?.sch || '');
            } catch {}
            return fb;
          }
        } catch (e2: any) {
          console.warn('[plans_v2/search:selftest] retry failed, using fallback', { using: usingEnv, error: e2?.message || String(e2) });
          const fallbackResp = await buildFallbackResponse({ body, includeNorm, excludeNorm, tags, q, limit, country });
          try {
            fallbackResp.headers.set('x-catalog-degraded', 'true');
            fallbackResp.headers.set('x-catalog-source', 'fallback');
            fallbackResp.headers.set('x-catalog-using', usingEnv || 'none');
          } catch {}
          return fallbackResp;
        }
      } else {
        console.warn('[plans_v2/search:selftest] catalog connection failed, using fallback', { using: usingEnv, error: e?.message || String(e) });
        const fallbackResp = await buildFallbackResponse({ body, includeNorm, excludeNorm, tags, q, limit, country });
        try {
          fallbackResp.headers.set('x-catalog-degraded', 'true');
          fallbackResp.headers.set('x-catalog-source', 'fallback');
          fallbackResp.headers.set('x-catalog-using', usingEnv || 'none');
        } catch {}
        return fallbackResp;
      }
    }

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

    try {
      const dbRows = await q<any>(sql, params);
      rows = dbRows;
      if (Array.isArray(rows) && rows.length > 0) usedCatalog = true;
    } catch (e: any) {
      const transientCode = getTransientErrorCode(e);
      if (transientCode) {
        try { telemetry.track('catalog.error', { provider: 'render', code: transientCode }); } catch {}
        await sleep(100 + Math.floor(Math.random() * 101));
        try {
          const dbRows2 = await q<any>(sql, params);
          rows = dbRows2;
          if (Array.isArray(rows) && rows.length > 0) usedCatalog = true;
        } catch {
          // fall through to fallback
        }
      }
      // else fall through to fallback
    }
  }

  // Add normalized prices (always enabled)
  if (Array.isArray(rows)) {
    rows = rows.map(row => {
      const normalizedPrice = normalizePriceToCOP(
        row.base_price,
        row.currency,
        row.price_period || 'monthly'
      );
      
      return {
        ...row,
        normalizedPrice
      };
    });
  }

  try {
    console.info('[plans_v2/search]', {
      includeCategories: includeNorm,
      country: country || null,
      count: Array.isArray(rows) ? rows.length : 0,
      runtime: getServerVar('NEXT_RUNTIME') || 'nodejs',
      limit,
      currencyNormEnabled: true,
    });
  } catch {}

  if (getServerVar('LOG_THIN_RESULTS') === 'true') {
    const durationMs = Date.now() - start;
    const domain = getDomainFromRequest(req);
    const datasource = getServerVar('BRIKI_DATA_SOURCE') || null;
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
    rows = await performJsonFallback({ includeNorm, excludeNorm, country, tags, q, limit });
  }

  // Lightweight relevance tweak: boost matches by intent keywords vs plan tags
  try {
    if (Array.isArray(rows) && rows.length > 0) {
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

  // Compute server-authoritative PRICE_NORMALIZED metadata and attach headers
  try {
    const normalizedCount = Array.isArray(rows)
      ? rows.reduce((acc: number, r: any) => acc + (r?.normalizedPrice ? 1 : 0), 0)
      : 0;
    const safeRows = Array.isArray(rows) ? rows : [];
    // Deterministic searchId using request filters (order-insensitive where applicable)
    const searchKey = JSON.stringify({
      country,
      include: Array.isArray(includeNorm) ? [...includeNorm].sort() : [],
      exclude: Array.isArray(excludeNorm) ? [...excludeNorm].sort() : [],
      tags: Array.isArray(tags) ? [...tags].sort() : [],
      q: String(q || ''),
      provider: providerRaw ? normalizeCarrier(String(providerRaw).trim()) : undefined,
      minPrice: typeof minPrice === 'number' ? minPrice : undefined,
      maxPrice: typeof maxPrice === 'number' ? maxPrice : undefined,
      benefitsContains: (Array.isArray((body as any)?.benefitsContains) ? (body as any).benefitsContains : String((body as any)?.benefitsContains || '')).toString(),
      sort: (body as any)?.sort || 'price_asc',
      limit: Math.min(Number(limit) || 20, 100),
    });
    const searchId = createHash('sha1').update(searchKey).digest('hex').slice(0, 12);
    const resultsSig = safeRows.map((r: any) => `${String(r.id ?? r.name ?? '')}|${String(r.provider ?? '')}|${String(r.category ?? '')}|${String(r?.normalizedPrice?.amountCOPMonthly ?? '')}`).join('|');
    const resultsHash = createHash('sha1').update(resultsSig).digest('hex').slice(0, 12);
    const runKey = `${searchId}|${resultsHash}`;

    const isCatalogSuccess = Boolean(usedCatalog && catalogTableExists && safeRows.length > 0);
    if (isCatalogSuccess) {
      try {
        telemetry.track('catalog.success', {
          using: usingEnv || 'none',
          db: metaInfo.db,
          schema: metaInfo.sch,
          rowCount: safeRows.length,
        });
      } catch {}
    }

    const payload = isCatalogSuccess
      ? {
          ok: true,
          degraded: false,
          source: 'catalog',
          items: safeRows,
          diagnostics: { using: usingEnv || 'none', db: metaInfo.db, schema: metaInfo.sch },
        }
      : {
          ok: true,
          degraded: true,
          source: 'fallback',
          items: safeRows,
        };

    const resp = NextResponse.json(payload as any, { status: 200 });
    try {
      resp.headers.set('x-price-normalized-count', String(normalizedCount));
      resp.headers.set('x-price-normalized-origin', 'server');
      resp.headers.set('x-price-normalized-runkey', runKey);
      resp.headers.set('x-search-id', searchId);
      resp.headers.set('x-catalog-source', isCatalogSuccess ? 'catalog' : 'fallback');
      resp.headers.set('x-catalog-degraded', isCatalogSuccess ? 'false' : 'true');
    } catch {}
    return resp;
  } catch {
    return NextResponse.json({ ok: true, degraded: !usedCatalog, source: usedCatalog ? 'catalog' : 'fallback', items: Array.isArray(rows) ? rows : [] }, { status: 200 });
  }
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



// Helpers
function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getTransientErrorCode(e: any): string | null {
  try {
    const codeRaw = (e?.code || e?.errno || '').toString().toUpperCase();
    if (codeRaw === 'ECONNREFUSED') return 'ECONNREFUSED';
    if (codeRaw === 'ETIMEDOUT' || codeRaw === 'ETIMEOUT') return 'ETIMEDOUT';
    const msg = (e?.message || e?.toString?.() || '').toString().toLowerCase();
    if (msg.includes('ssl') && msg.includes('syscall')) return 'SSL_SYSCALL';
  } catch {}
  return null;
}
async function performJsonFallback(args: {
  includeNorm: string[];
  excludeNorm: string[];
  country?: string;
  tags: any[];
  q: string;
  limit: number;
}) {
  const { includeNorm, excludeNorm, country, tags, q, limit } = args;
  try {
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
    let limited = filtered.slice(0, Math.min(Number(limit) || 20, 100));

    limited = limited.map((row: any) => {
      const normalizedPrice = normalizePriceToCOP(
        row.base_price,
        row.currency,
        row.price_period || 'monthly'
      );
      return { ...row, normalizedPrice };
    });
    try { console.info('[plans_v2/search:fallback]', { includeCategories: includeNorm, country: country || null, count: limited.length, currencyNormEnabled: true }); } catch {}
    return limited;
  } catch (e) {
    try { console.error('[plans_v2/search:fallback] failed', e); } catch {}
    return [];
  }
}

async function buildFallbackResponse(args: any) {
  const rows = await performJsonFallback(args);
  try {
    // lightweight intent scoring
    const needle = String(args.q || '').toLowerCase();
    const want = new Set<string>([]);
    if (/(grua|grúa|asistencia)/.test(needle)) want.add('asistencia vial');
    if (/(robo|hurto)/.test(needle)) want.add('robo total');
    if (/(rc|responsabilidad\s*civil)/.test(needle)) want.add('responsabilidad civil');
    const scored = rows.map((r: any, idx: number) => {
      const tagsArr = Array.isArray(r.tags) ? r.tags.map((t: any) => String(t).toLowerCase()) : [];
      let boost = 0; want.forEach((k) => { if (tagsArr.includes(k)) boost += 1; });
      return { r, s: boost, i: idx };
    });
    scored.sort((a, b) => (b.s - a.s) || (a.i - b.i));
    const ordered = scored.map((x) => x.r);
    return NextResponse.json({ ok: true, degraded: true, source: 'fallback', items: ordered }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true, degraded: true, source: 'fallback', items: rows }, { status: 200 });
  }
}

