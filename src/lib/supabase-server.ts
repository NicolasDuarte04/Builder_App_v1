import { createClient } from '@supabase/supabase-js';

// --- Robust env resolution helper ---
function readEnv(name: string, ...aliases: string[]): string | null {
  for (const key of [name, ...aliases]) {
    const v = process.env[key];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
const supabaseServiceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY');

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.log('ENV CHECK (supabase-server::resolved)', {
    url: !!supabaseUrl,
    svc: !!supabaseServiceKey,
    svcLen: supabaseServiceKey?.length || 0,
    aliasesTried: [
      'NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_KEY','SERVICE_ROLE_KEY'
    ]
  });
}

if (!supabaseUrl || !supabaseServiceKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY|SERVICE_ROLE_KEY');
  throw new Error(`Missing Supabase environment variable(s): ${missing.join(', ')}`);
}

// Server-side Supabase client with service role key
// This bypasses RLS and should only be used in secure server-side contexts
// Use service key server-side only
export function createServerSupabaseClient() {

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Client with anon key but with auth context
export function createAuthenticatedSupabaseClient(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const options: any = {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  };

  if (accessToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    };
  }

  return createClient(supabaseUrl, supabaseAnonKey, options);
} 