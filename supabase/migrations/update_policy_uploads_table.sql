-- Migration to update existing policy_uploads table
-- This handles the case where the table already exists with different structure

-- First, check if we need to update the user_id column type
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'policy_uploads' 
                   AND column_name = 'extracted_text') THEN
        ALTER TABLE public.policy_uploads ADD COLUMN extracted_text TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'policy_uploads' 
                   AND column_name = 'ai_summary') THEN
        ALTER TABLE public.policy_uploads ADD COLUMN ai_summary JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'policy_uploads' 
                   AND column_name = 'status') THEN
        ALTER TABLE public.policy_uploads 
        ADD COLUMN status TEXT DEFAULT 'uploading'
        CHECK (status IN ('uploading', 'processing', 'completed', 'error'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'policy_uploads' 
                   AND column_name = 'error_message') THEN
        ALTER TABLE public.policy_uploads ADD COLUMN error_message TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'policy_uploads' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE public.policy_uploads 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'policy_uploads' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.policy_uploads 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_policy_uploads_user_id ON public.policy_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_uploads_status ON public.policy_uploads(status);
CREATE INDEX IF NOT EXISTS idx_policy_uploads_upload_time ON public.policy_uploads(upload_time);

-- Enable RLS if not already enabled
ALTER TABLE public.policy_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to recreate with correct conditions)
DROP POLICY IF EXISTS "Users can view own policy uploads" ON public.policy_uploads;
DROP POLICY IF EXISTS "Users can insert own policy uploads" ON public.policy_uploads;
DROP POLICY IF EXISTS "Users can update own policy uploads" ON public.policy_uploads;
DROP POLICY IF EXISTS "Users can delete own policy uploads" ON public.policy_uploads;

-- Create RLS policies that work with text user_id
-- Note: These compare user_id (text) with auth.uid()::text
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
GRANT SELECT ON public.policy_uploads TO anon;

-- Add or update the trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.policy_uploads;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.policy_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at(); 