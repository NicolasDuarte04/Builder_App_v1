// Temporary feature flags for production-safe demo
// Flip to true to re-enable quickly. No backend behavior is changed.

export const ENABLE_INSURANCE_PORTAL: boolean = false;
export const ENABLE_SAVE_POLICY: boolean = false;

// UI-only dual-pane PDF verify feature (client)
// Toggle via env var NEXT_PUBLIC_ENABLE_PDF_VERIFY (string 'true' enables)
import { getPublicEnv } from '@/lib/env';

export const ENABLE_PDF_VERIFY: boolean = (() => {
  try { return String(getPublicEnv().NEXT_PUBLIC_ENABLE_PDF_VERIFY || '').toLowerCase() === 'true'; } catch { return false; }
})();

export const ENABLE_BRC_PORTAL: boolean = (() => {
  try { return String(getPublicEnv().NEXT_PUBLIC_ENABLE_BRC_PORTAL || '').toLowerCase() === 'true'; } catch { return false; }
})();

// UI-only proposal feature (client)
export const ENABLE_PROPOSAL: boolean = (() => {
  try { return String(getPublicEnv().NEXT_PUBLIC_ENABLE_PROPOSAL || '').toLowerCase() === 'true'; } catch { return false; }
})();

// Debug flag for portal development
export const DEBUG_PORTAL: boolean = (() => {
  try { return String(getPublicEnv().NEXT_PUBLIC_DEBUG_PORTAL || '').toLowerCase() === 'true'; } catch { return false; }
})();

// PDF thumbnail generation (requires native modules)
// Disabled by default on Vercel to avoid build failures
export const PDF_THUMBS_ENABLED: boolean = (() => {
  try {
    const env = (getPublicEnv().NEXT_PUBLIC_PDF_THUMBS || '').toLowerCase();
    if (env === 'off' || env === 'false' || env === '0') return false;
    return true;
  } catch { return true; }
})();


