import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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