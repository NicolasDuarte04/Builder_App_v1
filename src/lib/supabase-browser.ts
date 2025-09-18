import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

const pub = getPublicEnv();

export const supabase = createClient(
  pub.NEXT_PUBLIC_SUPABASE_URL,
  pub.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


