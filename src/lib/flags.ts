// Feature flag management system
const FLAGS = {
  HOMEPAGE_LAYOUT_V2: 'homepage_layout_v2',
  FF_OCR_FALLBACK: 'ff_ocr_fallback',
  FF_INCREDIBLE_BRIEF: 'ff_incredible_brief',
  FF_LONG_PASTE_GUARD: 'ff_long_paste_guard',
  CURRENCY_NORM: 'ff_currency_norm',
  TRUST_METADATA: 'enable_trust_metadata',
  // Public flags
  TEMPLATES_FALLBACK: 'enable_templates_fallback',
  NO_RESULTS_CHAT_NOTICE: 'enable_no_results_chat_notice'
} as const;

type FeatureFlag = typeof FLAGS[keyof typeof FLAGS];

// Get flag value from environment or localStorage
export function getFlag(key: keyof typeof FLAGS): boolean;
export function getFlag(flag: FeatureFlag): boolean;
export function getFlag(flagOrKey: FeatureFlag | keyof typeof FLAGS): boolean {
  // Support calling with either the key (e.g. 'TEMPLATES_FALLBACK') or the flag alias value
  const alias = (typeof flagOrKey === 'string' && Object.prototype.hasOwnProperty.call(FLAGS, flagOrKey))
    ? FLAGS[flagOrKey as keyof typeof FLAGS]
    : (flagOrKey as FeatureFlag);

  const envName = `NEXT_PUBLIC_${alias.toUpperCase()}`;

  if (typeof window === 'undefined') {
    // Server-side: check environment variable (accept '1' or 'true')
    const envVal = process.env[envName];
    return envVal === '1' || (envVal ?? '').toLowerCase() === 'true';
  }

  // Client-side: check localStorage, fallback to environment variable
  const localValue = localStorage.getItem(`flag_${alias}`);
  if (localValue !== null) {
    return localValue === '1';
  }

  const envVal = process.env[envName];
  return envVal === '1' || (envVal ?? '').toLowerCase() === 'true';
}

// Set flag value in localStorage
export function setFlag(flag: FeatureFlag, value: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`flag_${flag}`, value ? '1' : '0');
}

// Toggle flag value in localStorage
export function toggleFlag(flag: FeatureFlag): boolean {
  const newValue = !getFlag(flag);
  setFlag(flag, newValue);
  return newValue;
}

// Developer console toggle function
if (typeof window !== 'undefined') {
  (window as any).__toggleHomeV2 = () => {
    const newValue = toggleFlag(FLAGS.HOMEPAGE_LAYOUT_V2);
    console.log(`Homepage V2 layout ${newValue ? 'enabled' : 'disabled'}`);
    window.location.reload();
  };
}

// Feature flag assignment functions
export function assignOcrFallback(sessionId: string): 'control' | 'treatment' {
  // Simple hash-based assignment for consistent user experience
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Return 'treatment' for 50% of users (OCR enabled)
  return Math.abs(hash) % 2 === 0 ? 'treatment' : 'control';
}

export function assignIncredibleBrief(sessionId: string, force?: 'on' | 'off'): 'control' | 'treatment' {
  if (force === 'on') return 'treatment';
  if (force === 'off') return 'control';
  
  // Simple hash-based assignment for consistent user experience
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Return 'treatment' for 30% of users (incredible brief enabled)
  return Math.abs(hash) % 10 < 3 ? 'treatment' : 'control';
}

export function getFFIncredibleBrief({ sessionId, userId }: { sessionId: string; userId?: string }): boolean {
  const variant = assignIncredibleBrief(sessionId);
  return variant === 'treatment';
}

export function getFFLongPasteGuard({ sessionId, userId }: { sessionId: string; userId?: string }): boolean {
  // Simple hash-based assignment for consistent user experience
  let hash = 0;
  const input = sessionId + (userId || '');
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Return true for 20% of users (long paste guard enabled)
  return Math.abs(hash) % 10 < 2;
}

export function getFFCategoryChooser({ sessionId, userId }: { sessionId: string; userId?: string }): boolean {
  // Simple hash-based assignment for consistent user experience
  let hash = 0;
  const input = sessionId + (userId || '');
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Return true for 40% of users (category chooser enabled)
  return Math.abs(hash) % 10 < 4;
}

export { FLAGS };

// Typed accessors for public flags
export const isTemplatesFallbackEnabled = () => getFlag('TEMPLATES_FALLBACK');
export const isNoResultsChatNoticeEnabled = () => getFlag('NO_RESULTS_CHAT_NOTICE');