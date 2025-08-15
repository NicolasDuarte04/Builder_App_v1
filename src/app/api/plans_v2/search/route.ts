import { NextResponse } from 'next/server';
import { pool, hasDatabaseUrl } from '@/lib/render-db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!pool || !hasDatabaseUrl) {
    return NextResponse.json([], { status: 200 });
  }
  const body = await req.json().catch(() => ({}));
  const {
    country,
    includeCategories = [],
    excludeCategories = [],
    tags = [],
    q = '',
    limit = 20,
  } = body || {};

  const where: string[] = ['1=1'];
  const params: any[] = [];
  let i = 1;

  if (country) {
    where.push(`country = $${i++}`);
    params.push(country);
  }
  if (Array.isArray(includeCategories) && includeCategories.length > 0) {
    where.push(`category = ANY($${i++}::text[])`);
    params.push(includeCategories);
  }
  if (Array.isArray(excludeCategories) && excludeCategories.length > 0) {
    where.push(`NOT (category = ANY($${i++}::text[]))`);
    params.push(excludeCategories);
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
  where.push(`base_price > 0`);

  const sql = `SELECT id, provider, name, name_en, category, country, base_price, currency, external_link, brochure_link, benefits, benefits_en, tags
               FROM public.plans_v2
               WHERE ${where.join(' AND ')}
               ORDER BY provider, name
               LIMIT $${i}`;
  params.push(Math.min(Number(limit) || 20, 100));

  const res = await pool.query(sql, params);
  return NextResponse.json(res.rows, { status: 200 });
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


