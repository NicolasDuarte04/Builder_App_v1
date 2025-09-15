import { ComparedPlan, SourceKind } from '@/types/compare';
import { AnyPlan } from '@/types/plan';
import type { TemplatePlan as SmartTemplatePlan } from '@/types/results';
import type { TemplatePlan as LegacyTemplatePlan } from '@/types/compare';
import { NormalizedPlan } from '@/types/results';
import { Brief } from '@/types/brief';
import { normalizeCoverageList } from '@/lib/coveragesMap';
import { computeFitScore } from '@/lib/fitScore';

/**
 * Adapter to convert catalog plans to ComparedPlan format
 */
export function fromCatalog(p: AnyPlan, brief?: Brief): ComparedPlan {
  const priceCop = p._schema === 'v2' ? p.base_price : (p.base_price || null);
  const coverages = normalizeCoverageList(p.benefits || []);
  
  // Compute fit score if brief is provided
  const fitScore = brief ? computeFitScore(
    { maxBudgetCop: brief.maxBudgetCop, mustHaveCoverages: brief.mustHaveCoverages },
    { priceCop, benefits: p.benefits || [] }
  ) : undefined;

  return {
    id: p.id,
    source: { 
      kind: 'catalog', 
      ref: p.id,
      updatedAt: new Date().toISOString()
    },
    provider: p.provider,
    name: p.name,
    priceCop,
    priceEstCop: null,
    deductibles: null,
    coverages,
    exclusions: [],
    waitingTimes: [],
    fitScore,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Adapter to convert UI search result plans (PlanResultsSidebar/NewPlanCard) to ComparedPlan
 */
export function fromSearchResultPlan(
  p: {
    id: number | string;
    name: string;
    provider: string;
    basePrice?: number | null;
    benefits?: string[];
    currency?: string | null;
  },
  brief?: Brief
): ComparedPlan {
  const coverages = normalizeCoverageList(p.benefits || []);
  const priceCop = p.basePrice ?? null;

  // Compute fit score if brief is provided
  const fitScore = brief ? computeFitScore(
    { maxBudgetCop: brief.maxBudgetCop, mustHaveCoverages: brief.mustHaveCoverages },
    { priceCop, benefits: p.benefits || [] }
  ) : undefined;

  return {
    id: String(p.id),
    source: {
      kind: 'catalog',
      ref: String(p.id),
      updatedAt: new Date().toISOString()
    },
    provider: p.provider,
    name: p.name,
    priceCop,
    priceEstCop: null,
    deductibles: null,
    coverages,
    exclusions: [],
    waitingTimes: [],
    fitScore,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Adapter to convert template plans to ComparedPlan format
 */
export function fromTemplate(t: SmartTemplatePlan, brief?: Brief): ComparedPlan;
export function fromTemplate(t: LegacyTemplatePlan, brief?: Brief): ComparedPlan;
export function fromTemplate(t: any, brief?: Brief): ComparedPlan {
  const id: string = String(t.id);
  const title: string = t.title || t.name || t.planName || 'Template';

  // Support both new and legacy shapes
  const range = t.priceRangeCop
    ? { min: Number(t.priceRangeCop.min), max: Number(t.priceRangeCop.max) }
    : Array.isArray(t.estimatedMonthlyCopRange) && t.estimatedMonthlyCopRange.length === 2
    ? { min: Number(t.estimatedMonthlyCopRange[0]), max: Number(t.estimatedMonthlyCopRange[1]) }
    : undefined;

  const estimatedPrice = range ? Math.round((range.min + range.max) / 2) : null;

  const coveragesRaw: string[] = (t.suggestedCoverages || t.expectedCoverages || t.coverages || []) as string[];
  const coverages = normalizeCoverageList(coveragesRaw || []);

  const exclusionsRaw: string[] = (t.typicalExclusions || t.exclusions || []) as string[];
  const exclusions = normalizeCoverageList(exclusionsRaw || []);

  const sourceUpdatedAt: string | undefined = (t.source && t.source.updatedAt)
    || (Array.isArray(t.sources) && t.sources[0] && t.sources[0].updatedAt)
    || undefined;

  // Compute fit score if brief is provided, otherwise keep any precomputed value
  const fitScore: number | undefined = brief
    ? computeFitScore(
        { maxBudgetCop: brief.maxBudgetCop, mustHaveCoverages: brief.mustHaveCoverages },
        { priceRangeCop: range, suggestedCoverages: coveragesRaw || [] }
      )
    : (typeof t.fitScore === 'number' ? t.fitScore : undefined);

  return {
    id,
    source: {
      kind: 'template',
      ref: id,
      updatedAt: sourceUpdatedAt,
    },
    provider: undefined,
    name: title,
    priceCop: null,
    priceEstCop: estimatedPrice,
    deductibles: null,
    coverages,
    exclusions,
    waitingTimes: [],
    fitScore,
    updatedAt: sourceUpdatedAt || new Date().toISOString(),
  };
}

/**
 * Adapter to convert sourced plans (PDF, URL, text) to ComparedPlan format
 */
export function fromSource(
  s: NormalizedPlan, 
  kind: Exclude<SourceKind, 'catalog' | 'template'>,
  brief?: Brief
): ComparedPlan {
  const coverages = normalizeCoverageList(s.benefits);
  
  // Compute fit score if brief is provided
  const fitScore = brief ? computeFitScore(
    { maxBudgetCop: brief.maxBudgetCop, mustHaveCoverages: brief.mustHaveCoverages },
    { priceCop: s.priceCop, benefits: s.benefits }
  ) : undefined;

  return {
    id: `${kind}-${s.source.ref}`,
    source: { 
      kind,
      ref: s.source.ref,
      updatedAt: new Date().toISOString()
    },
    provider: s.provider,
    name: s.name,
    priceCop: s.priceCop,
    priceEstCop: null,
    deductibles: null,
    coverages,
    exclusions: normalizeCoverageList(s.exclusions),
    waitingTimes: [],
    fitScore,
    updatedAt: new Date().toISOString()
  };
}
