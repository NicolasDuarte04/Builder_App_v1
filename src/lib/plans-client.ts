import { InsurancePlan } from '@/types/project';
import { queryInsurancePlans as localQuery } from './render-db';

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
}

const EXTERNAL_URL = process.env.PLANS_API_URL || process.env.NEXT_PUBLIC_PLANS_API_URL;

export async function searchPlans(filters: PlanFilters): Promise<InsurancePlan[]> {
  if (!EXTERNAL_URL) {
    // local fallback
    return localQuery({
      category: filters.category,
      max_price: filters.max_price,
      country: filters.country,
      tags: filters.tags,
      benefits_contain: filters.benefits_contain,
      limit: filters.limit,
    });
  }

  const res = await fetch(`${EXTERNAL_URL.replace(/\/$/, '')}/plans/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(filters),
  });
  if (!res.ok) throw new Error(`plans api ${res.status}`);
  const json = await res.json();
  return json.plans ?? [];
}
