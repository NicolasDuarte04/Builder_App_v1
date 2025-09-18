import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

import { env, getServerVar } from '@/lib/env';

export async function GET(req: Request) {
  const hasCatalogEnv = Boolean(env.server.CATALOG_DB_RO_URL || env.server.CATALOG_DB_URL || getServerVar('CATALOG_DB_RO_URL') || getServerVar('CATALOG_DB_URL'));
  if (!hasCatalogEnv) {
    return NextResponse.json({ exists: false, count: 0 });
  }

  try {
    const { q } = await import('@/lib/db-catalog');
    const url = new URL(req.url);
    const wantCount = url.searchParams.get('count') === '1';

    const meta = await q<{ reg: string | null }>(
      `select to_regclass('public.plans_v2') as reg`
    );
    const reg = meta?.[0]?.reg ?? null;
    if (!reg) {
      return NextResponse.json({ exists: false, count: 0 });
    }

    if (wantCount) {
      const rows = await q<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM public.plans_v2`
      );
      const count = Number(rows?.[0]?.count ?? 0);
      return NextResponse.json({ exists: true, count });
    }

    return NextResponse.json({ exists: true, count: 0 });
  } catch {
    return NextResponse.json({ exists: false, count: 0 });
  }
}

