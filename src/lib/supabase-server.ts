import { createClient } from '@supabase/supabase-js';

// dev-only env check (top of file)
if (process.env.NODE_ENV !== 'production') {
  // Do NOT print full values
  // eslint-disable-next-line no-console
  console.log('ENV CHECK (supabase-server)', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSvc: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

// Server-side Supabase client with service role key
// This bypasses RLS and should only be used in secure server-side contexts
// Use service key server-side only
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    const miss = {
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
    };
    throw new Error(`Missing Supabase envs: ${Object.entries(miss).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'unknown'}`);
  }

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