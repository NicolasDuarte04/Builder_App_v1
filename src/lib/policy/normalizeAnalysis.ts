export type SavedAnalysis = {
  premium?: { amount?: number; currency?: string; frequency?: string } | null;
  coverage_limits: Array<{ label?: string; value?: string | number }>
  deductibles: Array<{ label?: string; value?: string | number }>
  main_features: string[]
  exclusions: string[]
  risk_evaluation?: { score?: number; bands?: string; notes?: string } | null;
  policy_details?: { number?: string | null; insurer?: string | null; type?: string | null; effective_date?: string | null } | null;
};

// Map live analyzer shape (PolicyAnalysisDisplay props) to SavedAnalysis contract
export function toSavedAnalysis(live: any): SavedAnalysis {
  const premium = live?.premium
    ? { amount: live.premium.amount, currency: live.premium.currency, frequency: live.premium.frequency }
    : null;
  const limitsEntries = Object.entries(live?.coverage?.limits || {});
  const deductEntries = Object.entries(live?.coverage?.deductibles || {});
  return {
    premium,
    coverage_limits: limitsEntries.map(([label, value]) => ({ label, value: value as any })),
    deductibles: deductEntries.map(([label, value]) => ({ label, value: value as any })),
    main_features: Array.isArray(live?.keyFeatures) ? live.keyFeatures : [],
    exclusions: Array.isArray(live?.coverage?.exclusions) ? live.coverage.exclusions : [],
    risk_evaluation: typeof live?.riskScore === 'number' || live?.riskJustification
      ? { score: live.riskScore, notes: live.riskJustification || '' }
      : null,
    policy_details: live?.policyDetails || null,
  };
}


