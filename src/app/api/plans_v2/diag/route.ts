import { NextResponse } from 'next/server';
import { pool, hasDatabaseUrl } from '@/lib/render-db';

export const runtime = 'nodejs';

export async function GET() {
  if (!pool || !hasDatabaseUrl) {
    return NextResponse.json({ ok: false, reason: 'no-db' }, { status: 200 });
  }
  const counts = await pool.query('SELECT COUNT(*)::int AS c FROM public.plans_v2');
  const sample = await pool.query("SELECT id, provider, name, category, country, brochure_link FROM public.plans_v2 ORDER BY RANDOM() LIMIT 3");
  return NextResponse.json({ ok: true, counts: counts.rows[0]?.c || 0, sample: sample.rows }, { status: 200 });
}


