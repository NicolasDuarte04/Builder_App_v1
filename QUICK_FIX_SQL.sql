-- Quick fix to add missing columns to policy_uploads table
-- Run this in Supabase SQL Editor

-- Add missing columns
ALTER TABLE public.policy_uploads 
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS ai_summary JSONB,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable RLS
ALTER TABLE public.policy_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view own policy uploads" ON public.policy_uploads;
DROP POLICY IF EXISTS "Users can insert own policy uploads" ON public.policy_uploads;
DROP POLICY IF EXISTS "Users can update own policy uploads" ON public.policy_uploads;
DROP POLICY IF EXISTS "Users can delete own policy uploads" ON public.policy_uploads;

-- Create new policies that work with text user_id
CREATE POLICY "Users can view own policy uploads" ON public.policy_uploads
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own policy uploads" ON public.policy_uploads
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own policy uploads" ON public.policy_uploads
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own policy uploads" ON public.policy_uploads
  FOR DELETE USING (user_id = auth.uid()::text);

-- Grant permissions
GRANT ALL ON public.policy_uploads TO authenticated; 