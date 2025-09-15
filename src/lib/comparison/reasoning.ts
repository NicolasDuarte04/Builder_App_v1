import { ComparedPlan } from '@/types/compare';
import { Brief } from '@/types/brief';
import { normalizeCoverageList } from '@/lib/coveragesMap';

/**
 * Maps coverages to tick states for must-have requirements
 * Returns array of 'ok' | 'partial' | 'miss' for each must-have coverage
 */
export function tickStatesForMustHaves(
  mustHaves: string[],
  planCoverages: string[]
): ('ok' | 'partial' | 'miss')[] {
  // Normalize both arrays for comparison
  const normalizedMustHaves = normalizeCoverageList(mustHaves);
  const normalizedPlanCoverages = normalizeCoverageList(planCoverages);
  
  return normalizedMustHaves.map(mustHave => {
    // Check for exact match (including synonyms handled by normalizeCoverage)
    if (normalizedPlanCoverages.includes(mustHave)) {
      return 'ok';
    }
    
    // Since we don't have optional/unknown flags in current data model,
    // treat all present coverages as 'ok', not 'partial'
    return 'miss';
  });
}

/**
 * Computes critical differences between compared plans
 * Returns exactly 3 concise bullets (≤120 chars each)
 */
export function computeCriticalDiffs(
  items: ComparedPlan[],
  brief: Brief
): string[] {
  const diffs: string[] = [];
  
  if (items.length < 2) {
    return ['Necesita al menos 2 planes para comparar', '', ''];
  }
  
  // 1. Price differences (prioritize real over estimated)
  const prices = items.map(p => ({
    price: p.priceCop ?? p.priceEstCop,
    isEstimated: p.priceCop === null || p.priceCop === undefined
  })).filter(p => p.price !== null && p.price !== undefined);
  
  if (prices.length >= 2) {
    const minPrice = Math.min(...prices.map(p => p.price!));
    const maxPrice = Math.max(...prices.map(p => p.price!));
    const hasEstimated = prices.some(p => p.isEstimated);
    
    if (brief.maxBudgetCop) {
      const overBudget = prices.filter(p => p.price! > brief.maxBudgetCop!).length;
      if (overBudget > 0) {
        diffs.push(`${overBudget} de ${items.length} exceden presupuesto $${brief.maxBudgetCop.toLocaleString('es-CO')}`);
      } else if (maxPrice > minPrice) {
        const variance = Math.round(((maxPrice - minPrice) / minPrice) * 100);
        const suffix = hasEstimated ? ' (est.)' : '';
        diffs.push(`Precios varían ${variance}%: $${minPrice.toLocaleString('es-CO')}-$${maxPrice.toLocaleString('es-CO')}${suffix}`);
      }
    } else if (maxPrice > minPrice) {
      const variance = Math.round(((maxPrice - minPrice) / minPrice) * 100);
      const suffix = hasEstimated ? ' (est.)' : '';
      diffs.push(`Diferencia de ${variance}% en precios${suffix}`);
    }
  }
  
  // 2. Must-have coverage gaps
  const normalizedMustHaves = normalizeCoverageList(brief.mustHaveCoverages || []);
  if (normalizedMustHaves.length > 0) {
    const missingByPlan = items.map(plan => {
      const normalizedPlanCoverages = normalizeCoverageList(plan.coverages);
      return normalizedMustHaves.filter(mh => !normalizedPlanCoverages.includes(mh));
    });
    
    // Find coverages that some plans are missing
    const allMissing = new Set<string>();
    missingByPlan.forEach(missing => missing.forEach(m => allMissing.add(m)));
    
    if (allMissing.size > 0) {
      const priorityCoverages = ['robo', 'asistencia', 'vidrios'];
      const priorityMissing = priorityCoverages.filter(pc => allMissing.has(pc));
      const toShow = priorityMissing.length > 0 ? priorityMissing : Array.from(allMissing);
      
      const plansWithGaps = missingByPlan.filter(m => m.length > 0).length;
      if (plansWithGaps === items.length) {
        diffs.push(`Ninguno cubre: ${toShow.slice(0, 2).join(', ')}`);
      } else {
        diffs.push(`${plansWithGaps} sin: ${toShow.slice(0, 2).join(', ')}`);
      }
    }
  }
  
  // 3. Punitive deductibles or exclusions
  const deductibleInfo: string[] = [];
  
  items.forEach((plan, idx) => {
    if (plan.deductibles && plan.deductibles !== '—') {
      const deductibleLower = plan.deductibles.toLowerCase();
      // Check for high deductibles on key coverages
      if (deductibleLower.includes('robo') && (deductibleLower.includes('alto') || deductibleLower.includes('20%') || deductibleLower.includes('30%'))) {
        deductibleInfo.push('Alto deducible en robo');
      } else if (deductibleLower.includes('%') && parseInt(deductibleLower.match(/(\d+)%/)?.[1] || '0') >= 20) {
        deductibleInfo.push('Deducibles altos (20%+)');
      }
    }
  });
  
  if (deductibleInfo.length > 0) {
    diffs.push(deductibleInfo[0]);
  } else {
    // Check exclusions as fallback
    const hasExclusions = items.filter(p => p.exclusions && p.exclusions.length > 0).length;
    if (hasExclusions > 0) {
      diffs.push(`${hasExclusions} planes con exclusiones importantes`);
    }
  }
  
  // Ensure exactly 3 items (pad with empty strings if needed)
  while (diffs.length < 3) {
    diffs.push('');
  }
  
  // Truncate to 120 chars and return exactly 3
  return diffs.slice(0, 3).map(d => d.slice(0, 120));
}

/**
 * Generates broker-friendly explanation of why these options are shown
 */
export function generateWhyTheseOptions(
  items: ComparedPlan[],
  brief: Brief
): string {
  if (items.length === 0) {
    return 'No se encontraron opciones para comparar.';
  }
  
  const parts: string[] = [];
  
  // Category context
  if (brief.category) {
    parts.push(`Comparando ${items.length} opciones de seguro ${brief.category.toLowerCase()}`);
  } else {
    parts.push(`Comparando ${items.length} opciones de seguro`);
  }
  
  // Budget context with COP formatting
  if (brief.maxBudgetCop) {
    const withinBudget = items.filter(p => {
      const price = p.priceCop ?? p.priceEstCop;
      return price !== null && price !== undefined && price <= brief.maxBudgetCop!;
    }).length;
    
    const budgetFormatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(brief.maxBudgetCop);
    
    if (withinBudget === items.length) {
      parts.push(`todas dentro del presupuesto de ${budgetFormatted}`);
    } else if (withinBudget > 0) {
      parts.push(`${withinBudget} se ajustan al presupuesto de ${budgetFormatted}`);
    } else {
      parts.push(`presupuesto de ${budgetFormatted} considerado`);
    }
  }
  
  // Must-have coverages
  const normalizedMustHaves = normalizeCoverageList(brief.mustHaveCoverages || []);
  if (normalizedMustHaves.length > 0) {
    const perfectMatches = items.filter(plan => {
      const normalizedPlanCoverages = normalizeCoverageList(plan.coverages);
      return normalizedMustHaves.every(mh => normalizedPlanCoverages.includes(mh));
    }).length;
    
    if (perfectMatches === items.length) {
      parts.push(`con las coberturas solicitadas (${normalizedMustHaves.slice(0, 2).join(', ')}${normalizedMustHaves.length > 2 ? '...' : ''})`);
    } else if (perfectMatches > 0) {
      parts.push(`${perfectMatches} incluyen todas las coberturas requeridas`);
    }
  }
  
  // Add disclaimer if non-catalog sources
  const nonCatalogSources = items.filter(p => p.source.kind !== 'catalog');
  if (nonCatalogSources.length > 0) {
    parts.push('. Nota: algunos datos provienen de documentos externos y pueden requerir verificación');
  }
  
  return parts.join(', ') + '.';
}