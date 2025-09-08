// Temporary feature flags for production-safe demo
// Flip to true to re-enable quickly. No backend behavior is changed.

export const ENABLE_INSURANCE_PORTAL: boolean = false;
export const ENABLE_SAVE_POLICY: boolean = false;

// UI-only dual-pane PDF verify feature (client)
// Toggle via env var NEXT_PUBLIC_ENABLE_PDF_VERIFY (string 'true' enables)
export const ENABLE_PDF_VERIFY: boolean =
  typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? String(process.env.NEXT_PUBLIC_ENABLE_PDF_VERIFY || '').toLowerCase() === 'true'
    : false;

export const ENABLE_BRC_PORTAL: boolean =
  typeof process !== "undefined" &&
  typeof process.env !== "undefined" &&
  process.env.NEXT_PUBLIC_BRC_PORTAL_ENABLED === "true";

// Debug flag for portal development
export const DEBUG_PORTAL: boolean =
  typeof process !== "undefined" &&
  typeof process.env !== "undefined" &&
  String(process.env.NEXT_PUBLIC_DEBUG_PORTAL || '').toLowerCase() === 'true';

// PDF thumbnail generation (requires native modules)
// Disabled by default on Vercel to avoid build failures
export const PDF_THUMBS_ENABLED: boolean = (() => {
  const env = (process?.env?.NEXT_PUBLIC_PDF_THUMBS || '').toLowerCase();
  if (env === 'off' || env === 'false' || env === '0') return false;
  // Disable by default on Vercel to avoid native module load
  if (process?.env?.VERCEL === '1' && env !== 'on' && env !== 'true') return false;
  return true; // default on in local dev
})();


