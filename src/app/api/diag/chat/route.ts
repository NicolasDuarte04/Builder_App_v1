import { NextResponse } from 'next/server';
import { searchPlans } from '@/lib/plans-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const preferredRegion = 'iad1';

interface ReqBody { category?: string; q?: string; limit?: number; }

export async function POST(req: Request) {
  let body: ReqBody = {};
  try { body = await req.json(); } catch {}

  const filters = {
    category: body.category || undefined,
    text: body.q || undefined,
    limit: body.limit || 4,
  };

  const plans = await searchPlans(filters);

  return NextResponse.json({
    runtime: process.env.NEXT_RUNTIME || 'node',
    dbUrlLen: (process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL || '').length,
    filters,
    planCount: plans.length,
    sample: plans.slice(0, 3).map(p => ({ id: p.id, provider: p.provider, plan_name_es: (p as any).plan_name_es, link_status: (p as any).link_status })),
  });
}
