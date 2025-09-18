import { createClient } from '@supabase/supabase-js';
import { env, getPublicEnv } from '@/lib/env';

// Server-side Supabase admin client (service role)
export const supabaseAdmin = createClient(
  env.server.SUPABASE_URL,
  env.server.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Client with anon key but with optional auth context (SSR helpers may use this)
export function createAuthenticatedSupabaseClient(accessToken?: string) {
  const pub = getPublicEnv();

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

  return createClient(pub.NEXT_PUBLIC_SUPABASE_URL, pub.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
}