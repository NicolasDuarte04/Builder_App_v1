import { ComparedPlan } from '@/types/compare';

export type CoverageStatus = 'included' | 'partial' | 'not_included';

/**
 * Determines coverage status for a plan based on coverage tokens
 */
export function getCoverageStatus(plan: ComparedPlan, coverageKey: string): CoverageStatus {
  const coverages = plan.coverages || [];
  
  // Check for exact match first
  if (coverages.includes(coverageKey)) {
    return 'included';
  }
  
  // Check for partial matches (e.g., "asistencia_basica" for "asistencia")
  const partialMatch = coverages.some(coverage => 
    coverage.includes(coverageKey) || coverageKey.includes(coverage)
  );
  
  if (partialMatch) {
    return 'partial';
  }
  
  return 'not_included';
}

/**
 * Gets coverage status for common insurance coverages
 */
export function getCommonCoverageStatus(plan: ComparedPlan) {
  return {
    asistencia: getCoverageStatus(plan, 'asistencia'),
    robo: getCoverageStatus(plan, 'robo'),
    vidrios: getCoverageStatus(plan, 'vidrios'),
  };
}

/**
 * Generates critical differences between compared plans
 * Returns exactly 3 bullet points
 */
export function generateCriticalDifferences(plans: ComparedPlan[]): string[] {
  if (plans.length < 2) return [];
  
  const differences: string[] = [];
  
  // 1. Price difference
  const prices = plans
    .map(p => p.priceCop || p.priceEstCop || 0)
    .filter(p => p > 0);
  
  if (prices.length >= 2) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceDiff = maxPrice - minPrice;
    const percentDiff = ((priceDiff / minPrice) * 100).toFixed(0);
    
    differences.push(
      `Diferencia de precio: hasta ${priceDiff.toLocaleString('es-CO')} COP/mes (${percentDiff}%)`
    );
  }
  
  // 2. Coverage differences
  const allCoverages = new Set<string>();
  plans.forEach(plan => {
    plan.coverages.forEach(coverage => allCoverages.add(coverage));
  });
  
  const coverageDiffs = Array.from(allCoverages).filter(coverage => {
    const planStatuses = plans.map(plan => getCoverageStatus(plan, coverage));
    const hasIncluded = planStatuses.includes('included');
    const hasNotIncluded = planStatuses.includes('not_included');
    return hasIncluded && hasNotIncluded;
  });
  
  if (coverageDiffs.length > 0) {
    const topDiff = coverageDiffs[0].replace(/_/g, ' ');
    differences.push(`Cobertura de ${topDiff}: no todos los planes la incluyen`);
  }
  
  // 3. Source reliability
  const sourceTypes = plans.map(p => p.source.kind);
  const hasCatalog = sourceTypes.includes('catalog');
  const hasTemplate = sourceTypes.includes('template');
  
  if (hasCatalog && hasTemplate) {
    differences.push('Mezcla de fuentes: datos oficiales y estimaciones');
  } else if (plans.some(p => p.source.kind !== 'catalog')) {
    differences.push('Algunos precios son estimaciones, no oficiales');
  } else {
    // Default difference about deductibles or exclusions
    const hasDeductibles = plans.some(p => p.deductibles && p.deductibles !== '—');
    if (hasDeductibles) {
      differences.push('Deducibles varían significativamente entre opciones');
    } else {
      differences.push('Tiempos de espera y exclusiones difieren entre planes');
    }
  }
  
  // Ensure exactly 3 differences
  while (differences.length < 3) {
    differences.push('Términos y condiciones específicos varían por proveedor');
  }
  
  return differences.slice(0, 3);
}

/**
 * Generates reasoning paragraph for why these options were selected
 */
export function generateComparisonReasoning(plans: ComparedPlan[]): string {
  if (plans.length < 2) return '';
  
  const hasNonCatalog = plans.some(p => p.source.kind !== 'catalog');
  const priceRange = plans
    .map(p => p.priceCop || p.priceEstCop || 0)
    .filter(p => p > 0);
  
  let reasoning = 'Estas opciones fueron seleccionadas para mostrar diferentes enfoques de cobertura y precio. ';
  
  if (priceRange.length >= 2) {
    const minPrice = Math.min(...priceRange);
    const maxPrice = Math.max(...priceRange);
    reasoning += `El rango de precios (${minPrice.toLocaleString('es-CO')} - ${maxPrice.toLocaleString('es-CO')} COP/mes) permite evaluar opciones económicas y premium. `;
  }
  
  const coverageVariety = new Set<string>();
  plans.forEach(plan => {
    plan.coverages.forEach(coverage => coverageVariety.add(coverage));
  });
  
  if (coverageVariety.size > 3) {
    reasoning += 'Cada plan ofrece un perfil de coberturas único para diferentes necesidades. ';
  }
  
  // Add disclaimer if needed
  if (hasNonCatalog) {
    reasoning += 'Nota: Algunos datos son estimaciones basadas en información pública, no cotizaciones oficiales.';
  }
  
  return reasoning.trim();
}

/**
 * Formats price with fallback to estimated price
 */
export function formatPlanPrice(plan: ComparedPlan): string {
  const price = plan.priceCop || plan.priceEstCop;
  if (!price || price <= 0) return '—';
  
  const formatted = price.toLocaleString('es-CO') + ' COP/mes';
  
  // Add "est." label if using estimated price
  if (!plan.priceCop && plan.priceEstCop) {
    return formatted + ' (est.)';
  }
  
  return formatted;
}

/**
 * Formats waiting times as comma-separated list
 */
export function formatWaitingTimes(plan: ComparedPlan): string {
  if (!plan.waitingTimes || plan.waitingTimes.length === 0) return '—';
  return plan.waitingTimes.join(', ');
}

/**
 * Formats exclusions with tooltip for overflow
 */
export function formatExclusions(plan: ComparedPlan): { visible: string[]; hidden: string[] } {
  if (!plan.exclusions || plan.exclusions.length === 0) {
    return { visible: [], hidden: [] };
  }
  
  return {
    visible: plan.exclusions.slice(0, 3),
    hidden: plan.exclusions.slice(3)
  };
}
