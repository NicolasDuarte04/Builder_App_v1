import type { Brief } from '@/types/brief';

export const BRIEF_WHITELIST_FIELDS = [
  'category',
  'maxBudgetCop',
  'mustHaveCoverages',
  'clientPersona',
  'notes',
  'docRefs',
] as const;

export type BriefWhitelistKey = typeof BRIEF_WHITELIST_FIELDS[number];

export function pickBriefWhitelist(patch: Partial<Brief> | null | undefined): Partial<Brief> {
  const out: Partial<Brief> = {};
  if (!patch || typeof patch !== 'object') return out;
  for (const key of BRIEF_WHITELIST_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      (out as any)[key] = (patch as any)[key];
    }
  }
  return out;
}


