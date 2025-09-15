import type { Brief } from '@/types/brief';
import { toCanonicalInputCategory, toStoredCategory } from '@/lib/category-alias';
import { normalizeCoverageList } from '@/lib/coveragesMap';

export type BriefError = { field: keyof Brief | string; code: string; detail?: string };

const MIN = 10_000;
const MAX = 10_000_000;

export function validateAndNormalizeBrief(input: Partial<Brief>) {
  const errors: BriefError[] = [];
  const out: Partial<Brief> = { ...input };

  // category allow-list via alias
  if (out.category) {
    const canon = toCanonicalInputCategory(out.category as any);
    const slug: any = canon
      ? ({ auto:'Vehículos', viaje:'Viajes', empresarial:'Otro', vida:'Vida', salud:'Salud', hogar:'Hogar', otros:'Otro' } as any)[canon]
      : undefined;
    if (!slug) {
      errors.push({ field: 'category', code: 'invalid_category' });
    } else {
      out.category = slug;
    }
  }

  // budget clamp
  if (typeof out.maxBudgetCop === 'number') {
    if (!Number.isFinite(out.maxBudgetCop)) {
      errors.push({ field: 'maxBudgetCop', code: 'invalid_number' });
      out.maxBudgetCop = null;
    } else {
      if (out.maxBudgetCop < MIN) { 
        errors.push({ field: 'maxBudgetCop', code: 'min_clamped', detail: String(MIN) }); 
        out.maxBudgetCop = MIN; 
      }
      if (out.maxBudgetCop > MAX) { 
        errors.push({ field: 'maxBudgetCop', code: 'max_clamped', detail: String(MAX) }); 
        out.maxBudgetCop = MAX; 
      }
    }
  }

  // coverages normalize + dedupe
  out.mustHaveCoverages = normalizeCoverageList(out.mustHaveCoverages || []);

  return { brief: out, errors };
}

export function briefStoredCategory(b: Partial<Brief>): string | undefined {
  return toStoredCategory(b.category as any);
}
