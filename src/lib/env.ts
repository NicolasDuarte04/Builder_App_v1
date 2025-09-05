// lib/env.ts
// Minimal, strict runtime validation for the variables Briki Co‑Pilot actually needs.

const REQUIRED = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'CATALOG_DB_URL',
    'OPENAI_API_KEY'
  ] as const;
  
  type Key = typeof REQUIRED[number];
  
  const env: Record<Key, string> = REQUIRED.reduce((acc, k) => {
    const v = process.env[k];
    if (!v) throw new Error(`[ENV] Missing ${k}. Add it to .env.local or your Vercel env.`);
    acc[k] = v;
    return acc;
  }, {} as Record<Key, string>);
  
  // Optional keys (don’t crash if absent)
  // Optional passthroughs, kept separate to avoid 'any' type spills
  const optionalKeys = ['CATALOG_DB_RO_URL', 'NEXT_PUBLIC_APP_FLAVOR'] as const;
  optionalKeys.forEach((k) => {
    const v = process.env[k as string];
    if (v) {
      (env as Record<string, string>)[k as string] = v;
    }
  });
  
  export default env;