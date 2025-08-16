import { NextResponse } from 'next/server';
import { pool, hasDatabaseUrl } from '@/lib/render-db';

export const runtime = 'nodejs';

function maskConnectionString(url: string | undefined) {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    const masked = new URL(u);
    if (masked.password) masked.password = '***';
    if (masked.username) masked.username = '***';
    return masked.toString();
  } catch {
    return undefined;
  }
}

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL;
  const maskedUrl = maskConnectionString(dbUrl);
  const info: any = {
    ok: false,
    hasDatabaseUrl,
    db_url_masked: maskedUrl,
    datasourceDetected: process.env.BRIKI_DATA_SOURCE || null,
  };

  if (!pool || !hasDatabaseUrl) {
    info.reason = 'no-db';
    return NextResponse.json(info, { status: 200 });
  }

  try {
    const hasTable = await pool.query("SELECT to_regclass('public.plans_v2') AS t");
    const tableReg = hasTable.rows?.[0]?.t as string | null;
    info.has_table = !!tableReg;

    if (!tableReg) {
      info.reason = 'missing-table';
      return NextResponse.json(info, { status: 200 });
    }

    const counts = await pool.query('SELECT COUNT(*)::int AS c FROM public.plans_v2');
    const sample = await pool.query(
      'SELECT id, provider, name, category, country, brochure_link FROM public.plans_v2 ORDER BY RANDOM() LIMIT 3'
    );
    info.ok = true;
    info.counts = counts.rows[0]?.c || 0;
    info.sample = sample.rows;
    return NextResponse.json(info, { status: 200 });
  } catch (err: any) {
    info.reason = 'query-error';
    info.error = String(err?.message || err);
    return NextResponse.json(info, { status: 200 });
  }
}


