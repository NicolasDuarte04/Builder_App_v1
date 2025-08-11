export type ProjectComplexity = 'simple' | 'medium' | 'complex';

export interface Project {
  id: string;
  title: string;
  description: string;
  complexity?: ProjectComplexity;
  createdAt: Date;
  updatedAt: Date;
  roadmap: RoadmapNode[];
}

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  tools?: Tool[];
  children?: RoadmapNode[];
  isCompleted?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  icon?: string;
}

export interface InsurancePlan {
  id: string;
  name: string;
  provider: string;
  base_price: number;
  base_price_formatted: string;
  benefits: string[];
  category: string;
  country: string;
  coverage_amount: number;
  coverage_amount_formatted: string;
  currency: string;
  rating: string;
  reviews: number;
  is_external: boolean;
  external_link: string | null;
  brochure_link: string | null;
  created_at: string;
  updated_at: string;
  
  // Extended fields for richer comparison
  plan_name_es?: string;
  plan_name_en?: string | null;
  provider_es?: string;
  provider_en?: string | null;
  monthly_premium?: number | null;
  monthly_premium_formatted?: string | null;
  deductible?: number | null;
  deductible_formatted?: string | null;
  min_age?: number | null;
  max_age?: number | null;
  requires_medical?: boolean | null;
  features?: any | null;
  tags?: string[];
  benefits_en?: string[];
  subcategory?: string | null;
  price_range?: string | null;
  target_demographic?: string[];
  coverage_type?: string | null;
  quote_link?: string | null;
  data_source?: string | null;
  last_synced_at?: string | null;
}

export interface InsurancePlanFromDB {
  id: number | string;
  name: string;
  provider: string;
  base_price: string | number;
  benefits: string[];
  category: string;
  country: string;
  coverage_amount: string | number;
  currency: string;
  rating: string;
  reviews: number;
  is_external: boolean;
  external_link: string | null;
  brochure_link: string | null;
  created_at: string;
  updated_at: string;
  
  // Extended fields from database
  plan_name_es?: string | null;
  plan_name_en?: string | null;
  provider_es?: string | null;
  provider_en?: string | null;
  monthly_premium?: string | number | null;
  deductible?: string | number | null;
  min_age?: number | null;
  max_age?: number | null;
  requires_medical?: boolean | null;
  features?: any | null;
  tags?: string[] | null;
  benefits_en?: string[] | null;
  subcategory?: string | null;
  price_range?: string | null;
  target_demographic?: string[] | null;
  coverage_type?: string | null;
  quote_link?: string | null;
  data_source?: string | null;
  last_synced_at?: string | null;
} 