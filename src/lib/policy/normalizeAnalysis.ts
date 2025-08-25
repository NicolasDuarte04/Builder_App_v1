export type SavedAnalysis = {
  premium?: { amount?: number | null; currency?: string | null; frequency?: string | null } | null;
  coverages?: Array<{ label?: string; value?: string | number }>
  deductibles?: Array<{ label?: string; value?: string | number }>
  features?: string[]
  exclusions?: string[]
  recommendations?: string[]
  risk?: { score?: number | null; meter?: number | null; notes?: string | string[] } | null;
  policyDetails?: Record<string, any> | null;
  counts?: { coverages: number; deductibles: number; features: number; exclusions: number; recommendations: number };
  analysisVersion?: string;
  source?: string;
};

// Map live analyzer shape (PolicyAnalysisDisplay props) to SavedAnalysis contract
export function toSavedAnalysis(live: any): SavedAnalysis {
  const premium = live?.premium
    ? { amount: live.premium.amount ?? null, currency: live.premium.currency ?? null, frequency: live.premium.frequency ?? null }
    : null;
  const coverages = Object.entries(live?.coverage?.limits || {}).map(([label, value]) => ({ label, value: value as any }));
  const deductibles = Object.entries(live?.coverage?.deductibles || {}).map(([label, value]) => ({ label, value: value as any }));
  const features = Array.isArray(live?.keyFeatures) ? live.keyFeatures : [];
  const exclusions = Array.isArray(live?.coverage?.exclusions) ? live.coverage.exclusions : [];
  const recommendations = Array.isArray(live?.recommendations) ? live.recommendations : [];
  const risk = (typeof live?.riskScore === 'number' || live?.riskJustification)
    ? { score: live.riskScore ?? null, meter: live.riskScore ?? null, notes: live.riskJustification || '' }
    : null;
  const counts = {
    coverages: coverages.length,
    deductibles: deductibles.length,
    features: features.length,
    exclusions: exclusions.length,
    recommendations: recommendations.length,
  };
  return {
    premium,
    coverages,
    deductibles,
    features,
    exclusions,
    recommendations,
    risk,
    policyDetails: live?.policyDetails || null,
    counts,
    analysisVersion: 'v1',
    source: 'analysis_modal',
  };
}


