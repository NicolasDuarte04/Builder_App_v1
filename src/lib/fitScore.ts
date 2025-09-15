import { normalizeCoverageList } from '@/lib/coveragesMap';

export interface BriefLike {
  maxBudgetCop?: number | null;
  mustHaveCoverages?: string[];
}

export interface PlanLike {
  priceRangeCop?: { min?: number; max?: number };
  priceCop?: number | null;
  suggestedCoverages?: string[];
  benefits?: string[];
}

/**
 * Compute fit score between a brief and a plan-like object
 * Returns integer 0-100, with coverage match (0-60) + budget fit (0-40)
 */
export function computeFitScore(brief: BriefLike, planLike: PlanLike): number {
  // Normalize coverage arrays
  const briefCoverages = normalizeCoverageList(brief.mustHaveCoverages || []);
  const planCoverages = normalizeCoverageList([
    ...(planLike.suggestedCoverages || []),
    ...(planLike.benefits || [])
  ]);

  // Coverage match (0-60): Jaccard against must-have set
  let coverageScore = 0;
  if (briefCoverages.length > 0) {
    const briefSet = new Set(briefCoverages);
    const planSet = new Set(planCoverages);
    
    // Count exact matches (weighted higher)
    const exactMatches = briefCoverages.filter(coverage => planSet.has(coverage)).length;
    
    // Jaccard similarity for remaining
    const intersection = new Set([...briefSet].filter(x => planSet.has(x)));
    const union = new Set([...briefSet, ...planSet]);
    
    if (union.size > 0) {
      const jaccard = intersection.size / union.size;
      // Weight exact matches higher: 70% exact match ratio + 30% jaccard
      const exactRatio = exactMatches / briefCoverages.length;
      coverageScore = Math.round(60 * (0.7 * exactRatio + 0.3 * jaccard));
    }
  } else {
    // No specific coverage requirements - neutral score
    coverageScore = 30;
  }

  // Budget fit (0-40)
  let budgetScore = 20; // neutral default
  
  if (brief.maxBudgetCop && brief.maxBudgetCop > 0) {
    // Pick price: priceCop ?? mid(priceRangeCop) if available
    let price: number | null = null;
    
    if (planLike.priceCop != null) {
      price = planLike.priceCop;
    } else if (planLike.priceRangeCop?.min != null && planLike.priceRangeCop?.max != null) {
      price = (planLike.priceRangeCop.min + planLike.priceRangeCop.max) / 2;
    }
    
    if (price != null && price > 0) {
      const budget = brief.maxBudgetCop;
      const ratio = price / budget;
      
      if (ratio <= 1) {
        // Within budget: score declines as we get too far below (undercoverage risk)
        if (ratio >= 0.5) {
          budgetScore = 40; // sweet spot: 50-100% of budget
        } else {
          // Soft penalty for being too cheap (potential undercoverage)
          budgetScore = Math.round(40 * (0.5 + 0.5 * (ratio / 0.5)));
        }
      } else {
        // Over budget: score declines as price exceeds budget
        const overBudgetRatio = Math.min(ratio - 1, 1); // cap at 100% over
        budgetScore = Math.round(40 * (1 - overBudgetRatio));
      }
    }
  }

  // Combine and clamp
  const totalScore = coverageScore + budgetScore;
  return Math.max(0, Math.min(100, Math.round(totalScore)));
}
