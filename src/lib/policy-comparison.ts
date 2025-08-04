/**
 * Policy Comparison Utilities
 * Compare two insurance policies and generate insights
 */

export interface PolicyComparison {
  differences: PolicyDifference[];
  recommendations: string[];
  summary: {
    betterValue: 'A' | 'B' | 'similar';
    betterCoverage: 'A' | 'B' | 'similar';
    overallRecommendation: string;
  };
}

export interface PolicyDifference {
  field: string;
  fieldLabel: string;
  valueA: any;
  valueB: any;
  comparison: string;
  impact: 'positive' | 'negative' | 'neutral';
  importance: 'high' | 'medium' | 'low';
}

/**
 * Compare two insurance policies and return detailed differences
 */
export function comparePolicies(policyA: any, policyB: any): PolicyComparison {
  const differences: PolicyDifference[] = [];
  const recommendations: string[] = [];
  
  // Helper function to add a difference
  const addDifference = (
    field: string,
    fieldLabel: string,
    valueA: any,
    valueB: any,
    comparison: string,
    impact: 'positive' | 'negative' | 'neutral' = 'neutral',
    importance: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    differences.push({
      field,
      fieldLabel,
      valueA,
      valueB,
      comparison,
      impact,
      importance
    });
  };
  
  // 1. Compare Premium
  if (policyA.premium && policyB.premium) {
    const premiumA = policyA.premium.amount || 0;
    const premiumB = policyB.premium.amount || 0;
    
    if (premiumA !== premiumB) {
      const diff = Math.abs(premiumB - premiumA);
      const percentDiff = ((diff / premiumA) * 100).toFixed(1);
      
      addDifference(
        'premium.amount',
        'Prima mensual',
        `${premiumA.toLocaleString()} ${policyA.premium.currency}`,
        `${premiumB.toLocaleString()} ${policyB.premium.currency}`,
        premiumB > premiumA 
          ? `Póliza B es ${diff.toLocaleString()} ${policyA.premium.currency} (${percentDiff}%) más cara`
          : `Póliza A es ${diff.toLocaleString()} ${policyA.premium.currency} (${percentDiff}%) más cara`,
        premiumB > premiumA ? 'negative' : 'positive',
        'high'
      );
    }
  }
  
  // 2. Compare Coverage Limits
  const limitsA = policyA.coverage?.limits || {};
  const limitsB = policyB.coverage?.limits || {};
  const allLimitKeys = new Set([...Object.keys(limitsA), ...Object.keys(limitsB)]);
  
  allLimitKeys.forEach(limitKey => {
    const limitA = limitsA[limitKey] || 0;
    const limitB = limitsB[limitKey] || 0;
    
    if (limitA !== limitB) {
      const humanKey = limitKey
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      addDifference(
        `coverage.limits.${limitKey}`,
        `Límite ${humanKey}`,
        limitA > 0 ? `${limitA.toLocaleString()} COP` : 'No cubierto',
        limitB > 0 ? `${limitB.toLocaleString()} COP` : 'No cubierto',
        limitB > limitA 
          ? `Póliza B ofrece ${(limitB - limitA).toLocaleString()} COP más de cobertura`
          : `Póliza A ofrece ${(limitA - limitB).toLocaleString()} COP más de cobertura`,
        limitB > limitA ? 'positive' : 'negative',
        'high'
      );
    }
  });
  
  // 3. Compare Deductibles
  const deductiblesA = policyA.coverage?.deductibles || {};
  const deductiblesB = policyB.coverage?.deductibles || {};
  const allDeductibleKeys = new Set([...Object.keys(deductiblesA), ...Object.keys(deductiblesB)]);
  
  allDeductibleKeys.forEach(deductibleKey => {
    const deductibleA = deductiblesA[deductibleKey] || 0;
    const deductibleB = deductiblesB[deductibleKey] || 0;
    
    if (deductibleA !== deductibleB) {
      const humanKey = deductibleKey
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      addDifference(
        `coverage.deductibles.${deductibleKey}`,
        `Deducible ${humanKey}`,
        deductibleA > 0 ? `${deductibleA.toLocaleString()} COP` : 'Sin deducible',
        deductibleB > 0 ? `${deductibleB.toLocaleString()} COP` : 'Sin deducible',
        deductibleB > deductibleA 
          ? `Póliza B tiene un deducible ${(deductibleB - deductibleA).toLocaleString()} COP más alto`
          : `Póliza A tiene un deducible ${(deductibleA - deductibleB).toLocaleString()} COP más alto`,
        deductibleB > deductibleA ? 'negative' : 'positive',
        'medium'
      );
    }
  });
  
  // 4. Compare Exclusions
  const exclusionsA = new Set(policyA.coverage?.exclusions || []);
  const exclusionsB = new Set(policyB.coverage?.exclusions || []);
  
  const onlyInA = [...exclusionsA].filter(x => !exclusionsB.has(x));
  const onlyInB = [...exclusionsB].filter(x => !exclusionsA.has(x));
  
  if (onlyInA.length > 0) {
    addDifference(
      'coverage.exclusions.onlyA',
      'Exclusiones solo en Póliza A',
      onlyInA,
      [],
      `Póliza A excluye ${onlyInA.length} elementos adicionales`,
      'negative',
      'high'
    );
  }
  
  if (onlyInB.length > 0) {
    addDifference(
      'coverage.exclusions.onlyB',
      'Exclusiones solo en Póliza B',
      [],
      onlyInB,
      `Póliza B excluye ${onlyInB.length} elementos adicionales`,
      'negative',
      'high'
    );
  }
  
  // 5. Compare Risk Scores
  if (policyA.riskScore !== undefined && policyB.riskScore !== undefined) {
    if (policyA.riskScore !== policyB.riskScore) {
      addDifference(
        'riskScore',
        'Puntuación de riesgo',
        `${policyA.riskScore}/10`,
        `${policyB.riskScore}/10`,
        policyB.riskScore > policyA.riskScore 
          ? 'Póliza B tiene mayor riesgo'
          : 'Póliza A tiene mayor riesgo',
        policyB.riskScore > policyA.riskScore ? 'negative' : 'positive',
        'high'
      );
    }
  }
  
  // 6. Compare Red Flags
  const redFlagsA = policyA.redFlags || [];
  const redFlagsB = policyB.redFlags || [];
  
  if (redFlagsA.length !== redFlagsB.length) {
    addDifference(
      'redFlags',
      'Alertas identificadas',
      `${redFlagsA.length} alertas`,
      `${redFlagsB.length} alertas`,
      redFlagsB.length > redFlagsA.length 
        ? `Póliza B tiene ${redFlagsB.length - redFlagsA.length} alertas más`
        : `Póliza A tiene ${redFlagsA.length - redFlagsB.length} alertas más`,
      redFlagsB.length > redFlagsA.length ? 'negative' : 'positive',
      'high'
    );
  }
  
  // Generate Summary and Recommendations
  const summary = generateSummary(policyA, policyB, differences);
  const detailedRecommendations = generateRecommendations(policyA, policyB, differences);
  
  return {
    differences,
    recommendations: [...recommendations, ...detailedRecommendations],
    summary
  };
}

/**
 * Generate a summary of the comparison
 */
function generateSummary(
  policyA: any,
  policyB: any,
  differences: PolicyDifference[]
): PolicyComparison['summary'] {
  // Calculate value score
  const premiumA = policyA.premium?.amount || 0;
  const premiumB = policyB.premium?.amount || 0;
  const coverageScoreA = calculateCoverageScore(policyA);
  const coverageScoreB = calculateCoverageScore(policyB);
  
  let betterValue: 'A' | 'B' | 'similar' = 'similar';
  let betterCoverage: 'A' | 'B' | 'similar' = 'similar';
  
  // Determine better value (lower premium for similar coverage)
  if (Math.abs(premiumA - premiumB) > premiumA * 0.1) { // More than 10% difference
    if (premiumA < premiumB && coverageScoreA >= coverageScoreB * 0.9) {
      betterValue = 'A';
    } else if (premiumB < premiumA && coverageScoreB >= coverageScoreA * 0.9) {
      betterValue = 'B';
    }
  }
  
  // Determine better coverage
  if (Math.abs(coverageScoreA - coverageScoreB) > 0.2) {
    betterCoverage = coverageScoreA > coverageScoreB ? 'A' : 'B';
  }
  
  // Generate overall recommendation
  let overallRecommendation = '';
  
  if (betterValue === 'A' && betterCoverage === 'A') {
    overallRecommendation = 'La Póliza A ofrece mejor valor y cobertura. Es la opción recomendada.';
  } else if (betterValue === 'B' && betterCoverage === 'B') {
    overallRecommendation = 'La Póliza B ofrece mejor valor y cobertura. Es la opción recomendada.';
  } else if (betterValue === 'A' && betterCoverage === 'B') {
    overallRecommendation = 'La Póliza A es más económica, pero la Póliza B ofrece mejor cobertura. Evalúe sus prioridades.';
  } else if (betterValue === 'B' && betterCoverage === 'A') {
    overallRecommendation = 'La Póliza B es más económica, pero la Póliza A ofrece mejor cobertura. Evalúe sus prioridades.';
  } else {
    overallRecommendation = 'Ambas pólizas son similares. Considere otros factores como servicio al cliente y reputación del asegurador.';
  }
  
  return {
    betterValue,
    betterCoverage,
    overallRecommendation
  };
}

/**
 * Calculate a coverage score for a policy
 */
function calculateCoverageScore(policy: any): number {
  let score = 0;
  
  // Coverage limits (higher is better)
  const limits = policy.coverage?.limits || {};
  const totalLimits = Object.values(limits).reduce((sum: number, limit: any) => sum + (limit || 0), 0) as number;
  score += Math.min(totalLimits / 100000000, 5); // Max 5 points for limits
  
  // Deductibles (lower is better)
  const deductibles = policy.coverage?.deductibles || {};
  const avgDeductible = Object.values(deductibles).reduce((sum: number, d: any) => sum + (d || 0), 0) as number / (Object.keys(deductibles).length || 1);
  score += Math.max(5 - (avgDeductible / 1000000), 0); // Max 5 points for low deductibles
  
  // Exclusions (fewer is better)
  const exclusions = policy.coverage?.exclusions || [];
  score += Math.max(3 - (exclusions.length / 10), 0); // Max 3 points for few exclusions
  
  // Risk score (lower is better)
  const riskScore = policy.riskScore || 5;
  score += Math.max(2 - (riskScore / 5), 0); // Max 2 points for low risk
  
  return score;
}

/**
 * Generate detailed recommendations based on the comparison
 */
function generateRecommendations(
  policyA: any,
  policyB: any,
  differences: PolicyDifference[]
): string[] {
  const recommendations: string[] = [];
  
  // Premium analysis
  const premiumDiff = differences.find(d => d.field === 'premium.amount');
  if (premiumDiff) {
    const higherPremiumPolicy = premiumDiff.impact === 'negative' ? 'B' : 'A';
    const premiumA = policyA.premium?.amount || 0;
    const premiumB = policyB.premium?.amount || 0;
    const percentDiff = Math.abs(((premiumB - premiumA) / premiumA) * 100);
    
    if (percentDiff > 30) {
      recommendations.push(
        `La Póliza ${higherPremiumPolicy} es significativamente más cara (${percentDiff.toFixed(0)}%). ` +
        `Asegúrese de que la cobertura adicional justifique el costo extra.`
      );
    }
  }
  
  // Coverage gaps
  const limitDiffs = differences.filter(d => d.field.startsWith('coverage.limits.'));
  const missingCoverageA = limitDiffs.filter(d => d.valueA === 'No cubierto');
  const missingCoverageB = limitDiffs.filter(d => d.valueB === 'No cubierto');
  
  if (missingCoverageA.length > 0) {
    recommendations.push(
      `La Póliza A no cubre: ${missingCoverageA.map(d => d.fieldLabel.replace('Límite ', '')).join(', ')}. ` +
      `Considere si necesita estas coberturas.`
    );
  }
  
  if (missingCoverageB.length > 0) {
    recommendations.push(
      `La Póliza B no cubre: ${missingCoverageB.map(d => d.fieldLabel.replace('Límite ', '')).join(', ')}. ` +
      `Considere si necesita estas coberturas.`
    );
  }
  
  // Deductible analysis
  const deductibleDiffs = differences.filter(d => d.field.startsWith('coverage.deductibles.'));
  const highDeductibles = deductibleDiffs.filter(d => {
    const valueA = parseInt(d.valueA.replace(/[^\d]/g, '') || '0');
    const valueB = parseInt(d.valueB.replace(/[^\d]/g, '') || '0');
    return Math.max(valueA, valueB) > 5000000; // More than 5M COP
  });
  
  if (highDeductibles.length > 0) {
    recommendations.push(
      `Algunas coberturas tienen deducibles altos (más de 5M COP). ` +
      `Asegúrese de poder cubrir estos montos en caso de siniestro.`
    );
  }
  
  // Red flags
  const redFlagsA = policyA.redFlags || [];
  const redFlagsB = policyB.redFlags || [];
  
  if (redFlagsA.length > 3 || redFlagsB.length > 3) {
    recommendations.push(
      `Se identificaron múltiples alertas en las pólizas. ` +
      `Revise cuidadosamente las exclusiones y limitaciones antes de decidir.`
    );
  }
  
  // Risk score
  if (policyA.riskScore >= 7 || policyB.riskScore >= 7) {
    recommendations.push(
      `Al menos una póliza tiene un puntaje de riesgo alto. ` +
      `Considere buscar opciones adicionales con mejor cobertura.`
    );
  }
  
  return recommendations;
}

/**
 * Format currency values for display
 */
export function formatCurrency(amount: number, currency: string = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Export comparison results to a structured format
 */
export function exportComparison(
  comparison: PolicyComparison,
  policyA: any,
  policyB: any
): {
  csv: string;
  json: string;
} {
  // CSV Export
  const csvRows = [
    ['Campo', 'Póliza A', 'Póliza B', 'Comparación', 'Impacto'],
    ...comparison.differences.map(d => [
      d.fieldLabel,
      Array.isArray(d.valueA) ? d.valueA.join('; ') : d.valueA,
      Array.isArray(d.valueB) ? d.valueB.join('; ') : d.valueB,
      d.comparison,
      d.impact
    ])
  ];
  
  const csv = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  // JSON Export
  const jsonExport = {
    metadata: {
      comparisonDate: new Date().toISOString(),
      policyA: {
        type: policyA.policyType,
        insurer: policyA.insurer?.name,
        premium: policyA.premium
      },
      policyB: {
        type: policyB.policyType,
        insurer: policyB.insurer?.name,
        premium: policyB.premium
      }
    },
    comparison,
    fullPolicies: { policyA, policyB }
  };
  
  return {
    csv,
    json: JSON.stringify(jsonExport, null, 2)
  };
}