import { createClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';

const pub = getPublicEnv();

// Create Supabase client
export const supabase = createClient(
  pub.NEXT_PUBLIC_SUPABASE_URL,
  pub.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Tool types matching our database schema
export interface Tool {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  capabilities: string | null;
  website_url: string | null;
  votes: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Tool categories (matching what's in the database)
export const TOOL_CATEGORIES = [
  'ai',
  'development',
  'design',
  'productivity',
  'other'
] as const;

export type ToolCategory = typeof TOOL_CATEGORIES[number]; 