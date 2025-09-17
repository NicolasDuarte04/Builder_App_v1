import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('__schema') !== '1') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const usingEnv = process.env.CATALOG_DB_RO_URL
    ? 'CATALOG_DB_RO_URL'
    : (process.env.CATALOG_DB_URL ? 'CATALOG_DB_URL' : 'none');

  try {
    const { q } = await import('@/lib/db-catalog');
    const meta = await q<{
      current_database: string | null;
      current_schema: string | null;
      server_version_num: number | null;
      reg: string | null;
    }>(
      `select current_database(), current_schema(), to_regclass('public.plans_v2') as reg, current_setting('server_version_num')::int as server_version_num`
    );
    const row = meta?.[0] || ({} as any);
    return NextResponse.json({
      using: usingEnv,
      db: row?.current_database || null,
      schema: row?.current_schema || null,
      server_version_num: row?.server_version_num ?? null,
      plans_v2_exists: Boolean(row?.reg),
    });
  } catch (e) {
    return NextResponse.json({
      using: usingEnv,
      db: null,
      schema: null,
      server_version_num: null,
      plans_v2_exists: false,
    }, { status: 200 });
  }
}


