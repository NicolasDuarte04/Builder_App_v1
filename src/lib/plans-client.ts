import { InsurancePlan } from '@/types/project';
import { queryInsurancePlans as localQuery } from './render-db';
import type { AnyPlan, PlanLegacy, PlanV2 } from '@/types/plan';
import { fetchSelf } from '@/lib/server/fetch-self';
import { normalizeIncludeExclude, toStoredCategory } from '@/lib/category-alias';

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
  // Normalize category aliases and ensure country is set when not provided
  const includeNorm = normalizeIncludeExclude(filters.includeCategories);
  const excludeNorm = normalizeIncludeExclude(filters.excludeCategories);
  const country = filters.country || 'CO';
  const normalizedFilters: PlanFilters = {
    ...filters,
    country,
    category: toStoredCategory(filters.category) || filters.category,
    includeCategories: includeNorm.length ? includeNorm : undefined,
    excludeCategories: excludeNorm.length ? excludeNorm : undefined,
  };
  const ds = process.env.BRIKI_DATA_SOURCE;
  // New v2 source path (shadow or primary)
  if (ds === 'plans_v2' || ds === 'plans_v2_shadow') {
    // Strict v2 mode: use v2 API; do NOT silently fall back to legacy when v2 is enabled
    try {
      const body = { ...normalizedFilters } as any;
      // Use absolute URL on the server to avoid "Invalid URL" in Node fetch
      const isServer = typeof window === 'undefined';
      const doFetch = async () => {
        if (isServer) {
          return fetchSelf('/api/plans_v2/search', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });
        }
        return fetch('/api/plans_v2/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      };
      const res = await doFetch();
      if (!res.ok) {
        const msg = `[plans] v2 search failed: ${res.status}`;
        console.error(msg);
        if (ds === 'plans_v2') throw new Error(msg);
        return [];
      }
      const rows: any[] = await res.json();
      const mapped: PlanV2[] = (Array.isArray(rows) ? rows : []).map((r) => ({
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
      console.log('[plans] datasource used', { datasource: ds, used: 'plans_v2', count: mapped.length });
      return mapped;
    } catch (e) {
      if (ds === 'plans_v2') throw e;
      console.error('[plans] v2_shadow request error; returning empty array', e);
      return [];
    }
  }

  // Legacy path with safe fallback to v2 shadow if empty or error
  if (!EXTERNAL_URL) {
    try {
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
      if (mapped.length) return mapped;
      console.warn('[plans] legacy returned 0, falling back to v2 shadow');
    } catch (e) {
      console.error('[plans] legacy error, falling back to v2 shadow', e);
    }
    // Read from local ETL output (shadow)
    const fs = await import('node:fs');
    const path = await import('node:path');
    const root = process.cwd();
    const jsonPath = path.join(root, 'scripts', 'etl', 'dist', 'plans_v2.json');
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    const filtered = (Array.isArray(data) ? data : []).filter((r: any) => {
      const cat = String(r.category || '').toLowerCase();
      if (filters.includeCategories?.length && !filters.includeCategories.map((c) => c.toLowerCase()).includes(cat)) return false;
      if (filters.excludeCategories?.length && filters.excludeCategories.map((c) => c.toLowerCase()).includes(cat)) return false;
      return true;
    });
    console.log('[plans] datasource used', { datasource: process.env.BRIKI_DATA_SOURCE ?? 'legacy/fallback-logic' });
    return filtered.map((r: any) => ({
      id: r.id,
      name: r.name,
      name_en: r.name_en ?? r.name,
      provider: r.provider,
      category: r.category,
      country: r.country,
      base_price: r.base_price ?? null,
      currency: r.currency,
      website: r.external_link,
      brochure: r.brochure_link ?? null,
      benefits: r.benefits ?? [],
      benefits_en: r.benefits_en ?? [],
      tags: r.tags ?? [],
      _schema: 'v2',
    }));
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
