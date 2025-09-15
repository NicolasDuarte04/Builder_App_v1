import { Brief } from '@/types/brief';
import { toStoredCategory } from '@/lib/category-alias';
import { normalizeCoverageList } from '@/lib/coveragesMap';

/**
 * Build plan search filters from a Brief object
 */
export function buildPlanFiltersFromBrief(brief: Brief): {
  category: string;
  country: 'CO';
  max_price?: number;
  benefits_contain?: string;
  limit: number;
} {
  const category = toStoredCategory(brief.category) || 'auto';
  const maxPrice = brief.maxBudgetCop || undefined;
  
  const normalized = normalizeCoverageList(brief.mustHaveCoverages || []);
  const benefitsContain = normalized.length ? normalized.join(',') : undefined;

  return {
    category,
    country: 'CO',
    max_price: maxPrice,
    benefits_contain: benefitsContain,
    limit: 3
  };
}

/**
 * Build concise assistant context string from Brief
 */
export function buildAssistantContext(brief: Brief): string {
  const parts: string[] = [];
  
  // Determine if Spanish based on persona or category
  const isSpanish = detectSpanishContext(brief);
  
  // Category
  if (brief.category) {
    const categoryLabel = isSpanish ? getCategorySpanish(brief.category) : brief.category;
    parts.push(`${isSpanish ? 'Categoría' : 'Category'}: ${categoryLabel}`);
  }
  
  // Budget
  if (brief.maxBudgetCop) {
    const budgetStr = formatCurrency(brief.maxBudgetCop);
    parts.push(`${isSpanish ? 'Presupuesto' : 'Budget'}: ${budgetStr}`);
  }
  
  // Must-haves
  if (brief.mustHaveCoverages?.length) {
    const coverages = brief.mustHaveCoverages.slice(0, 3).join(', ');
    parts.push(`${isSpanish ? 'Esenciales' : 'Must-haves'}: ${coverages}`);
  }
  
  // Persona
  if (brief.clientPersona) {
    const personaShort = brief.clientPersona.length > 20 
      ? brief.clientPersona.substring(0, 20) + '...'
      : brief.clientPersona;
    parts.push(`${isSpanish ? 'Perfil' : 'Persona'}: ${personaShort}`);
  }
  
  const result = parts.join(' • ');
  return result.length > 140 ? result.substring(0, 137) + '...' : result;
}

/**
 * Build template specification for Smart Template when search comes back empty
 */
export function buildTemplateSpec(brief: Brief): {
  enabled: boolean;
  template: 'smart-default-v1';
  inputs: Record<string, any>;
} {
  const inputs: Record<string, any> = {};
  
  // Add available brief data as template inputs
  if (brief.category) {
    inputs.category = brief.category;
  }
  
  if (brief.maxBudgetCop) {
    inputs.maxBudget = brief.maxBudgetCop;
  }
  
  if (brief.mustHaveCoverages?.length) {
    inputs.requiredCoverages = brief.mustHaveCoverages;
  }
  
  if (brief.exclusions?.length) {
    inputs.exclusions = brief.exclusions;
  }
  
  if (brief.clientPersona) {
    inputs.clientPersona = brief.clientPersona;
  }
  
  if (brief.locale) {
    inputs.locale = brief.locale;
  }
  
  return {
    enabled: true,
    template: 'smart-default-v1',
    inputs
  };
}

// Helper functions

/**
 * Detect if context should be in Spanish
 */
function detectSpanishContext(brief: Brief): boolean {
  // Check locale first
  if (brief.locale === 'es') return true;
  if (brief.locale === 'en') return false;
  
  // Check persona for Spanish indicators
  if (brief.clientPersona) {
    const spanishTerms = ['padre', 'madre', 'familia', 'hijo', 'hija', 'esposo', 'esposa', 'joven', 'adulto', 'mayor'];
    const lowerPersona = brief.clientPersona.toLowerCase();
    if (spanishTerms.some(term => lowerPersona.includes(term))) {
      return true;
    }
  }
  
  // Default to Spanish (Colombian context)
  return true;
}

/**
 * Get Spanish category name
 */
function getCategorySpanish(category: string): string {
  const categoryMap: Record<string, string> = {
    'Vehículos': 'vehículos',
    'Salud': 'salud',
    'Viajes': 'viajes',
    'Vida': 'vida',
    'Hogar': 'hogar',
    'Otro': 'otro'
  };
  
  return categoryMap[category] || category.toLowerCase();
}

/**
 * Format currency for display
 */
import { formatCurrency } from '@/lib/utils';

// Removed local formatCurrency implementation in favor of the shared one in utils.ts
