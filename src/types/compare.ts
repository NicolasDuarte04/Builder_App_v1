export type SourceKind = 'catalog'|'template'|'pdf'|'url'|'text';

export interface ComparedPlan {
  id: string;
  source: { kind: SourceKind; ref: string; updatedAt?: string };
  provider?: string;            // from data (never infer)
  name?: string;                // from data (never infer)
  priceCop?: number | null;     // real monthly COP if known
  priceEstCop?: number | null;  // estimated monthly COP
  deductibles?: string | null;
  coverages: string[];          // canonical tokens (Step-7)
  exclusions?: string[];        // top exclusions
  waitingTimes?: string[];      // e.g., maternity 10m
  fitScore?: number;            // 0..100 if available
  updatedAt?: string;           // ISO
}

export interface TemplatePlan {
  id: string; 
  title: string; 
  category: string;
  expectedCoverages: string[]; 
  typicalExclusions: string[];
  estimatedMonthlyCopRange?: [number, number];
  redFlags?: string[];
  sources: { type:'pdf'|'url'|'text'; ref:string; updatedAt:string }[];
}

// Compatibility aliases for existing types
export type ProposalPlan = { 
  id: string; 
  name_es: string; 
  insurers: { name: string }; 
  plan_pricing: any[]; 
  plan_benefits: any[]; 
  source_url?: string; 
  last_verified_at?: string; 
  analysis?: any 
};
