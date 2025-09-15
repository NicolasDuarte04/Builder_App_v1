export type { TemplatePlan } from '@/lib/templates/buildSmartTemplates';

export type NormalizedPlan = {
  provider?: string;
  name?: string;
  priceCop?: number | null;
  benefits: string[]; // canonical tokens
  exclusions?: string[];
  source: { kind: 'pdf' | 'url' | 'text'; ref: string; updatedAt?: string };
};


