import { NextResponse } from 'next/server';
import { pool, hasDatabaseUrl } from '@/lib/render-db';
import { normalizeIncludeExclude, normalizeCategory } from '@/lib/category-alias';

export const runtime = 'nodejs';

export async function GET() {
  const ok = !!pool && hasDatabaseUrl;
  let plansCount: number | null = null;
  let datasourceDetected = 'unknown';
  let categories: string[] = [];

  if (pool) {
    try {
      const res = await pool.query('SELECT COUNT(*)::int AS c FROM public.plans_v2');
      plansCount = res.rows[0]?.c ?? null;
      datasourceDetected = 'plans_v2';
      const cats = await pool.query('SELECT DISTINCT category FROM public.plans_v2 ORDER BY category');
      categories = cats.rows.map((r: any) => r.category);
    } catch {
      // ignore
    }
  }

  const aliasMap = {
    educacion: 'educativa',
  };

  return NextResponse.json({ ok, datasourceDetected, plansCount, categories, aliasMap });
}


