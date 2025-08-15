import { InsurancePlan } from '@/types/project';
import { queryInsurancePlans as localQuery } from './render-db';
import type { AnyPlan, PlanLegacy, PlanV2 } from '@/types/plan';

export interface PlanFilters {
  category?: string;
  subcategory?: string;
  text?: string;
  limit?: number;
  offset?: number;
  country?: string;
  max_price?: number;
  tags?: string[];
  benefits_contain?: string;
  includeCategories?: string[];
  excludeCategories?: string[];
}

const EXTERNAL_URL = process.env.PLANS_API_URL || process.env.NEXT_PUBLIC_PLANS_API_URL;

export async function searchPlans(filters: PlanFilters): Promise<AnyPlan[]> {
  const ds = process.env.BRIKI_DATA_SOURCE;
  // New v2 source path (shadow or primary)
  if (ds === 'plans_v2' || ds === 'plans_v2_shadow') {
    // Fetch from the new table via existing API if present, or fall back to local DB query with SQL targeting plans_v2
    if (EXTERNAL_URL) {
      const body = {
        ...filters,
        includeCategories: filters.includeCategories,
        excludeCategories: filters.excludeCategories,
        dataSource: ds,
      };
      const res = await fetch(`${EXTERNAL_URL.replace(/\/$/, '')}/plans_v2/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`plans_v2 api ${res.status}`);
      const json = await res.json();
      const rows: any[] = json.plans ?? [];
      const mapped: PlanV2[] = rows.map((r) => ({
        id: String(r.id),
        name: r.name,
        name_en: r.name_en ?? r.name,
        provider: r.provider,
        category: r.category,
        country: r.country,
        base_price: Number(r.base_price),
        currency: r.currency,
        external_link: r.external_link,
        brochure_link: r.brochure_link ?? null,
        benefits: Array.isArray(r.benefits) ? r.benefits : [],
        benefits_en: Array.isArray(r.benefits_en) ? r.benefits_en : [],
        tags: Array.isArray(r.tags) ? r.tags : [],
        _schema: 'v2',
      }));
      return mapped;
    }
    // If no external API, we can still use the legacy query for UI fallback; return legacy until API exists
    const legacy = await localQuery({
      category: filters.category,
      max_price: filters.max_price,
      country: filters.country,
      tags: filters.tags,
      benefits_contain: filters.benefits_contain,
      limit: filters.limit,
    });
    const asLegacy: PlanLegacy[] = legacy.map((p) => ({
      id: String(p.id),
      name: p.name,
      name_en: (p as any).plan_name_en ?? null,
      provider: p.provider,
      category: p.category,
      country: (p.country as 'CO' | 'MX') ?? 'CO',
      base_price: typeof p.base_price === 'number' ? p.base_price : Number(p.base_price) || null,
      currency: (p.currency as any) ?? 'COP',
      website: p.external_link ?? null,
      brochure: p.brochure_link ?? null,
      benefits: p.benefits ?? [],
      benefits_en: (p as any).benefits_en ?? [],
      tags: p.tags ?? [],
      _schema: 'legacy',
    }));
    // Apply category include/exclude client-side as a fallback
    return asLegacy.filter((row) => {
      const cat = String(row.category || '').toLowerCase();
      if (filters.includeCategories && filters.includeCategories.length > 0) {
        if (!filters.includeCategories.map((c) => c.toLowerCase()).includes(cat)) return false;
      }
      if (filters.excludeCategories && filters.excludeCategories.length > 0) {
        if (filters.excludeCategories.map((c) => c.toLowerCase()).includes(cat)) return false;
      }
      return true;
    });
  }

  // Legacy path
  if (!EXTERNAL_URL) {
    const rows = await localQuery({
      category: filters.category,
      max_price: filters.max_price,
      country: filters.country,
      tags: filters.tags,
      benefits_contain: filters.benefits_contain,
      limit: filters.limit,
    });
    const mapped: PlanLegacy[] = rows.map((p) => ({
      id: String(p.id),
      name: p.name,
      name_en: (p as any).plan_name_en ?? null,
      provider: p.provider,
      category: p.category,
      country: (p.country as 'CO' | 'MX') ?? 'CO',
      base_price: typeof p.base_price === 'number' ? p.base_price : Number(p.base_price) || null,
      currency: (p.currency as any) ?? 'COP',
      website: p.external_link ?? null,
      brochure: p.brochure_link ?? null,
      benefits: p.benefits ?? [],
      benefits_en: (p as any).benefits_en ?? [],
      tags: p.tags ?? [],
      _schema: 'legacy',
    }));
    return mapped;
  }

  const res = await fetch(`${EXTERNAL_URL.replace(/\/$/, '')}/plans/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(filters),
  });
  if (!res.ok) throw new Error(`plans api ${res.status}`);
  const json = await res.json();
  const rows: any[] = json.plans ?? [];
  const mapped: PlanLegacy[] = rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    name_en: r.name_en ?? null,
    provider: r.provider,
    category: r.category,
    country: (r.country as 'CO' | 'MX') ?? 'CO',
    base_price: Number(r.base_price) || null,
    currency: r.currency ?? 'COP',
    website: r.external_link ?? null,
    brochure: r.brochure_link ?? null,
    benefits: Array.isArray(r.benefits) ? r.benefits : [],
    benefits_en: Array.isArray(r.benefits_en) ? r.benefits_en : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    _schema: 'legacy',
  }));
  return mapped;
}
