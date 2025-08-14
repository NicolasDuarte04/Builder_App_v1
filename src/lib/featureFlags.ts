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


