// lib/env.ts
// Minimal, strict runtime validation for the variables Briki Co‑Pilot actually needs.

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY'
] as const;

type Key = typeof REQUIRED[number];

const baseEnv: Record<Key, string> = REQUIRED.reduce((acc, k) => {
  const v = process.env[k];
  if (!v) throw new Error(`[ENV] Missing ${k}. Add it to .env.local or your Vercel env.`);
  acc[k] = v;
  return acc;
}, {} as Record<Key, string>);

// Optional keys (don’t crash if absent)
// Optional passthroughs, kept separate to avoid 'any' type spills
const optionalKeys = [
  'CATALOG_DB_RO_URL',
  // CATALOG_DB_URL is intentionally optional; routes degrade to 503 if missing
  'CATALOG_DB_URL',
  'NEXT_PUBLIC_APP_FLAVOR',
  // Trial gate (UI hints only for NEXT_PUBLIC_*)
  'NEXT_PUBLIC_TRIAL_GATE_ENABLED',
  'TRIAL_CODES',
  'TRIAL_TTL_DAYS',
  'TRIAL_GATE_BACKEND',
  'TRIAL_JWT_SECRET',
  'TRIAL_GATE_ENABLED'
] as const;
optionalKeys.forEach((k) => {
  const v = process.env[k as string];
  if (v) {
    (baseEnv as Record<string, string>)[k as string] = v;
  }
});

// Server-side trial gate env (non-public)
export const env = {
  TRIAL_GATE_ENABLED: process.env.TRIAL_GATE_ENABLED === '1',
  TRIAL_CODES: (process.env.TRIAL_CODES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  TRIAL_TTL_DAYS: Number(process.env.TRIAL_TTL_DAYS || 14),
  TRIAL_JWT_SECRET: process.env.TRIAL_JWT_SECRET || 'dev-secret'
};

// Catalog DB envs (explicit exports, do not throw if missing)
export const CATALOG_DB_URL = process.env.CATALOG_DB_URL || '';
export const CATALOG_DB_RO_URL = process.env.CATALOG_DB_RO_URL || '';

// Dev-only, log once at boot which catalog env will be used
declare global {
  // eslint-disable-next-line no-var
  var __CATALOG_ENV_LOGGED__: boolean | undefined;
}

try {
  if (process.env.NODE_ENV !== 'production' && !global.__CATALOG_ENV_LOGGED__) {
    global.__CATALOG_ENV_LOGGED__ = true;
    if (!CATALOG_DB_URL && !CATALOG_DB_RO_URL) {
      console.warn('[Catalog] No CATALOG_DB_URL/RO set; plans catalog is disabled');
    } else {
      console.log('[Catalog] Using', CATALOG_DB_RO_URL ? 'CATALOG_DB_RO_URL' : 'CATALOG_DB_URL');
    }
  }
} catch {}

export default baseEnv;