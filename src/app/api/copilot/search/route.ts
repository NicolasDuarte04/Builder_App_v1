import { NextRequest, NextResponse } from 'next/server';
// Lazy-load to avoid env access at build time

export const runtime = 'nodejs';

type Brief = { category_code: string; budget_high?: number; must_haves?: string[] };

export async function POST(req: NextRequest) {
  const { q } = await import('@/lib/db-catalog');
  const brief = (await req.json()) as Brief;

  const rows = await q<any>(/*sql*/`
    select
      p.id,
      p.name_es,
      p.name_en,
      p.source_url,
      p.status,
      p.last_verified_at,
      i.name as insurer,
      (
        select coalesce(json_agg(json_build_object(
          'premium_min', pp.premium_min,
          'premium_max', pp.premium_max,
          'currency', pp.currency,
          'billing_period', pp.billing_period
        ) order by pp.premium_min asc), '[]'::json)
        from catalog.plan_pricing pp
        where pp.plan_id = p.id
      ) as pricing,
      (
        select coalesce(json_agg(json_build_object(
          'key', b.key,
          'value_es', b.value_es,
          'value_en', b.value_en
        )), '[]'::json)
        from catalog.plan_benefits b
        where b.plan_id = p.id
      ) as benefits
    from catalog.plans p
    join catalog.insurers i on i.id = p.insurer_id
    where p.category_code = $1
      and p.status = 'active'
    limit 50
  `, [brief.category_code]);

  const must = Array.isArray(brief.must_haves) ? brief.must_haves : [];
  const scored = rows.map((p: any) => {
    const price = (p.pricing?.[0]) || null;
    const fit = price?.premium_min && brief.budget_high
      ? Math.max(0, 1 - (Number(price.premium_min) / Number(brief.budget_high)))
      : 0.5;

    const coverageCount = must.filter((k: string) =>
      (p.benefits || []).some((b: any) => b.key === k)
    ).length;
    const coverage = must.length ? coverageCount / must.length : 0.5;

    const fresh = p.last_verified_at ? 1 : 0.5;
    const score = fit * 0.4 + coverage * 0.4 + fresh * 0.2;

    return { ...p, score };
  }).sort((a: any, b: any) => b.score - a.score);

  const top3 = scored.slice(0, 3).map((p: any) => ({
    id: p.id,
    name_es: p.name_es,
    name_en: p.name_en,
    source_url: p.source_url,
    last_verified_at: p.last_verified_at,
    insurers: { name: p.insurer },
    plan_pricing: p.pricing,
    plan_benefits: p.benefits,
    score: p.score,
  }));

  return NextResponse.json(top3);
}


