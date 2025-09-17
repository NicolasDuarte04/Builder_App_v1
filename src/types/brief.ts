export type BriefSource = 'paste'|'upload'|'manual'|'url';

export interface Brief {
  id: string; 
  userId: string; 
  sessionId: string;
  clientId?: string; // Added for RLS support
  locale: 'es'|'en'; 
  source: BriefSource;
  category: 'Vehículos'|'Salud'|'Viajes'|'Vida'|'Hogar'|'Otro'|null;
  maxBudgetCop: number|null;
  budgetCurrency?: 'COP'|'USD';
  mustHaveCoverages: string[];
  exclusions?: string[];
  clientPersona?: string;
  notes?: string;
  rawText?: string;
  docRefs?: { type:'pdf'|'url'|'text'; ref:string; title?:string; extractedAt?:string }[];
  createdAt: string; 
  updatedAt: string; 
  version: number;
  isApplied: boolean;
}

// Compatibility aliases for existing types
export type ProposalBrief = { 
  category_code: 'auto' | 'health' | 'life' | 'travel'; 
  budget_high: number; 
  must_haves: string[] 
};

// --- Diagnostics helpers ---
export type BriefDiagnostics = {
  missing: string[];
  inconsistencies: { field: string; code: string; detail?: string }[];
  duplicates: string[]; // duplicate coverage names
};

/**
 * Compute diagnostics to drive the AuditChips UI.
 * Accepts the current brief (possibly partial) and the errors array returned by validateAndNormalizeBrief.
 */
export function getBriefDiagnostics(
  brief: Partial<Brief> | null | undefined,
  errors: ReadonlyArray<{ field: string; code: string; detail?: string }>
): BriefDiagnostics {
  const b = brief || {};
  const missing: string[] = [];

  // Required minimal field for search: category
  if (!b.category) missing.push('category');

  // Inconsistencies: collapse by field, surface unique (keep first occurrence)
  const inconsistencies: { field: string; code: string; detail?: string }[] = [];
  const seenInc = new Set<string>();
  for (const e of errors || []) {
    const key = `${e.field}:${e.code}`;
    if (!seenInc.has(key)) {
      inconsistencies.push({ field: String(e.field), code: e.code, detail: e.detail });
      seenInc.add(key);
    }
  }

  // Duplicates in mustHaveCoverages (case/diacritics-insensitive)
  const duplicates: string[] = [];
  if (Array.isArray(b.mustHaveCoverages) && b.mustHaveCoverages.length > 0) {
    const normalize = (s: string) => (s || '').normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase().trim();
    const seen = new Map<string, string>();
    for (const item of b.mustHaveCoverages) {
      const key = normalize(item);
      if (!key) continue;
      if (seen.has(key)) {
        // Use first-seen original for display if available, else current
        duplicates.push(seen.get(key) || item);
      } else {
        seen.set(key, item);
      }
    }
  }

  return { missing, inconsistencies, duplicates };
}

/**
 * Focus a brief field in the UI by its field name.
 * Returns true if a focusable element was found.
 */
export function focusField(fieldName: string): boolean {
  try {
    if (typeof window === 'undefined') return false;

    const selectorByField: Record<string, string> = {
      category: '#category',
      maxBudgetCop: '#budget',
      mustHaveCoverages: '#coverageInput',
      clientPersona: '#clientPersona',
      notes: '#notes',
    };

    const selector = selectorByField[fieldName] || `#${fieldName}`;
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      // Ensure visible and focus
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
      el.focus();
      return true;
    }
  } catch {}
  return false;
}
