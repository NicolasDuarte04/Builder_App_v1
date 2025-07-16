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
} 