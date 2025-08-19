import { NextResponse } from 'next/server';
import { pool, hasDatabaseUrl } from '@/lib/render-db';
import { normalizeIncludeExclude } from '@/lib/category-alias';
import { getDomainFromRequest } from '@/lib/server/base-url';
import { writeReport } from '@/lib/observability/reports';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!pool || !hasDatabaseUrl) {
    return NextResponse.json([], { status: 200 });
  }
  const start = Date.now();
  const requestId = Math.random().toString(36).slice(2, 7);
  const body = await req.json().catch(() => ({}));
  const {
    country,
    includeCategories = [],
    excludeCategories = [],
    tags = [],
    q = '',
    limit = 20,
  } = body || {};

  const includeNorm = normalizeIncludeExclude(includeCategories);
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
  // Do NOT filter out quote-only or missing-price plans. The UI handles placeholder display.

  const sql = `SELECT id, provider, name, name_en, category, country, base_price, currency, external_link, brochure_link, benefits, benefits_en, tags
               FROM public.plans_v2
               WHERE ${where.join(' AND ')}
               ORDER BY provider, name
               LIMIT $${i}`;
  params.push(Math.min(Number(limit) || 20, 100));

  const res = await pool.query(sql, params);
  const rows = res.rows;

  try {
    console.info('[plans_v2/search]', {
      includeCategories: includeNorm,
      country: country || null,
      count: Array.isArray(rows) ? rows.length : 0,
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
      includeCategories: Array.isArray(includeCategories) ? includeCategories : [],
      excludeCategories: Array.isArray(excludeCategories) ? excludeCategories : [],
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
  const limit = Number(url.searchParams.get('limit') || '20');
  return POST(new Request(req.url, { method: 'POST', body: JSON.stringify({ country, includeCategories, excludeCategories, tags, q, limit }) }));
}


