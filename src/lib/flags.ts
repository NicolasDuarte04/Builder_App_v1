export const FLAGS = {
  enrichedCatalog: process.env.NEXT_PUBLIC_FLAG_ENRICHED_CATALOG === '1',
  newSearchRanking: process.env.NEXT_PUBLIC_FLAG_NEW_SEARCH_RANKING === '1',
  multiPdf: process.env.NEXT_PUBLIC_FF_MULTI_PDF === '1',
  currencyNorm: process.env.NEXT_PUBLIC_FF_CURRENCY_NORM === '1',
  // L13 flags
  longPasteGuard: process.env.NEXT_PUBLIC_FF_LONG_PASTE_GUARD === '1',
  ocrFallback: process.env.NEXT_PUBLIC_FF_OCR_FALLBACK === '1',
  // Trust metadata rendering (client-gated)
  trustMetadata: (process.env.NEXT_PUBLIC_ENABLE_TRUST_METADATA === 'true' || process.env.NEXT_PUBLIC_ENABLE_TRUST_METADATA === '1'),
} as const;

export type FlagVariant = 'control' | 'treatment';

// Stable bucketing for ff_incredible_brief feature flag
export function assignIncredibleBrief(sessionId: string, force?: 'on'|'off'): FlagVariant {
  if (force === 'on') return 'treatment';
  if (force === 'off') return 'control';
  
  const pct = Number(process.env.NEXT_PUBLIC_FF_INCREDIBLE_BRIEF_PCT ?? '10'); // default 10%
  const h = [...sessionId].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0) >>> 0;
  const bucket = h % 100;
  return bucket < pct ? 'treatment' : 'control';
}

// Stable bucketing for ff_ocr_fallback feature flag
export function assignOcrFallback(sessionId: string, force?: 'on'|'off'): FlagVariant {
  if (force === 'on') return 'treatment';
  if (force === 'off') return 'control';
  
  // If global flag is off, always return control
  if (!FLAGS.ocrFallback) return 'control';
  
  const pct = Number(process.env.NEXT_PUBLIC_FF_OCR_FALLBACK_PCT ?? '50'); // default 50% rollout
  const h = [...sessionId].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0) >>> 0;
  const bucket = h % 100;
  return bucket < pct ? 'treatment' : 'control';
}


// FNV-1a 32-bit hash for stable, fast bucketing
export function hash32(input: string): number {
  let hash = 0x811c9dc5; // 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193); // 16777619
  }
  return (hash >>> 0) | 0; // force unsigned 32-bit
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function resolvePercent(flag: string, defaultPercent: number): number {
  let raw: string | undefined;
  if (flag === 'ff_incredible_brief') {
    raw = process.env.FF_INCREDIBLE_BRIEF_PERCENT;
  }

  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : defaultPercent;
  const percent = Number.isNaN(parsed) ? defaultPercent : parsed;
  return clampPercent(percent);
}

export type Exposure = {
  variant: 'on' | 'off';
  bucket: number; // 0..99
  percent: number; // 0..100
};

// Stable exposure computation using hashing to a 0..99 bucket
export function getExposure(
  sessionId: string,
  flag: string,
  defaultPercent: number = 10
): Exposure {
  const percent = resolvePercent(flag, defaultPercent);
  const seed = `${flag}:${String(sessionId ?? '')}`;
  const bucket = hash32(seed) % 100; // 0..99
  const variant: Exposure['variant'] = bucket < percent ? 'on' : 'off';
  return { variant, bucket, percent };
}

export function isEnabled(
  sessionId: string,
  flag: string,
  defaultPercent: number = 10
): boolean {
  return getExposure(sessionId, flag, defaultPercent).variant === 'on';
}



// --- Deterministic rollout for ff_incredible_brief ---
// One-time emit guard per runtime/page-load
let ffIncredibleBriefReported = false;

function readIncredibleBriefPercent(): number {
  const raw = (process.env.NEXT_PUBLIC_FF_INCREDIBLE_BRIEF_PCT ?? '10').trim();
  const parsed = Number.parseInt(raw, 10);
  const percent = Number.isNaN(parsed) ? 10 : parsed;
  return clampPercent(percent);
}

// Deterministic, per-user rollout for ff_incredible_brief
export function getFFIncredibleBrief(params: { sessionId?: string | null; userId?: string | null }): boolean {
  const { sessionId, userId } = params || {};
  const identity = String(userId || sessionId || 'guest');
  const percent = readIncredibleBriefPercent();
  const seed = `ff_incredible_brief:${identity}`;
  const bucket = hash32(seed) % 100; // 0..99
  const enabled = bucket < percent;

  // Emit assignment once per runtime/page load
  if (!ffIncredibleBriefReported) {
    try {
      // Lazy import to avoid any circular deps and keep this module lightweight
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { telemetry } = require('./telemetry');
      const eventName = (telemetry?.events && telemetry.events.FF_ASSIGNMENT) || 'FF_ASSIGNMENT';
      telemetry.track(eventName, {
        flag: 'ff_incredible_brief',
        variant: enabled ? 'on' : 'off',
        pct: percent,
      });
    } catch {}
    ffIncredibleBriefReported = true;
  }

  return enabled;
}


// --- Deterministic rollout for ff_long_paste_guard (ON by default) ---
let ffLongPasteGuardReported = false;

function readLongPasteGuardPercent(): number {
  const raw = (process.env.NEXT_PUBLIC_FF_LONG_PASTE_GUARD_PCT ?? '100').trim();
  const parsed = Number.parseInt(raw, 10);
  const percent = Number.isNaN(parsed) ? 100 : parsed;
  return clampPercent(percent);
}

export function getFFLongPasteGuard(params: { sessionId?: string | null; userId?: string | null }): boolean {
  const { sessionId, userId } = params || {};
  const identity = String(userId || sessionId || 'guest');
  const percent = readLongPasteGuardPercent();
  const seed = `ff_long_paste_guard:${identity}`;
  const bucket = hash32(seed) % 100; // 0..99
  const enabled = bucket < percent;

  if (!ffLongPasteGuardReported) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { telemetry } = require('./telemetry');
      const eventName = (telemetry?.events && telemetry.events.FF_ASSIGNMENT) || 'FF_ASSIGNMENT';
      telemetry.track(eventName, {
        flag: 'ff_long_paste_guard',
        variant: enabled ? 'on' : 'off',
        pct: percent,
      });
    } catch {}
    ffLongPasteGuardReported = true;
  }

  return enabled;
}

// --- Deterministic rollout for ff_category_chooser ---
let ffCategoryChooserReported = false;

function readCategoryChooserPercent(): number {
  const raw = (process.env.NEXT_PUBLIC_FF_CATEGORY_CHOOSER_PCT ?? '100').trim();
  const parsed = Number.parseInt(raw, 10);
  const percent = Number.isNaN(parsed) ? 100 : parsed;
  return clampPercent(percent);
}

export function getFFCategoryChooser(params: { sessionId?: string | null; userId?: string | null }): boolean {
  const { sessionId, userId } = params || {};
  const identity = String(userId || sessionId || 'guest');
  const percent = readCategoryChooserPercent();
  const seed = `ff_category_chooser:${identity}`;
  const bucket = hash32(seed) % 100; // 0..99
  const enabled = bucket < percent;

  if (!ffCategoryChooserReported) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { telemetry } = require('./telemetry');
      const eventName = (telemetry?.events && telemetry.events.FF_ASSIGNMENT) || 'FF_ASSIGNMENT';
      telemetry.track(eventName, {
        flag: 'ff_category_chooser',
        variant: enabled ? 'on' : 'off',
        pct: percent,
      });
    } catch {}
    ffCategoryChooserReported = true;
  }

  return enabled;
}

// --- Deterministic rollout for ff_ocr_fallback (OFF by default) ---
let ffOcrFallbackReported = false;

function readOcrFallbackPercent(): number {
  const raw = (process.env.NEXT_PUBLIC_FF_OCR_FALLBACK_PCT ?? '0').trim();
  const parsed = Number.parseInt(raw, 10);
  const percent = Number.isNaN(parsed) ? 0 : parsed;
  return clampPercent(percent);
}

export function getFFOcrFallback(params: { sessionId?: string | null; userId?: string | null }): boolean {
  const { sessionId, userId } = params || {};
  const identity = String(userId || sessionId || 'guest');
  const percent = readOcrFallbackPercent();
  const seed = `ff_ocr_fallback:${identity}`;
  const bucket = hash32(seed) % 100; // 0..99
  const enabled = bucket < percent;

  if (!ffOcrFallbackReported) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { telemetry } = require('./telemetry');
      const eventName = (telemetry?.events && telemetry.events.FF_ASSIGNMENT) || 'FF_ASSIGNMENT';
      telemetry.track(eventName, {
        flag: 'ff_ocr_fallback',
        variant: enabled ? 'on' : 'off',
        pct: percent,
      });
    } catch {}
    ffOcrFallbackReported = true;
  }

  return enabled;
}

// --- L13 Helper Functions ---

// Helper for consistent flag reading with user context
export async function getL13Flags(params?: { sessionId?: string | null; userId?: string | null }) {
  // Lazy import to avoid circular deps
  const { getUserContext } = await import('./telemetry');
  const context = params || await getUserContext();
  
  return {
    longPasteGuard: getFFLongPasteGuard(context),
    multiPdf: FLAGS.multiPdf,
    currencyNorm: FLAGS.currencyNorm,
    ocrFallback: getFFOcrFallback(context),
  };
}

// Helper for consistent event naming
export const L13_EVENTS = {
  PASTE_LONG_GUARDED: 'paste_long_guarded',
  PDFS_ATTACHED: 'pdfs_attached', 
  PDF_PRIMARY_SET: 'pdf_primary_set',
  CATEGORY_DISAMBIGUATED: 'category_disambiguated',
  PDF_OCR_STARTED: 'pdf_ocr_started',
  PDF_OCR_COMPLETED: 'pdf_ocr_completed',
  PDF_OCR_FAILED: 'pdf_ocr_failed',
  PRICE_NORMALIZED: 'price_normalized',
} as const;