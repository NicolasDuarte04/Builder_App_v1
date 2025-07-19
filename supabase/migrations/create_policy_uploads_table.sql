-- Create policy_uploads table
CREATE TABLE IF NOT EXISTS public.policy_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  extracted_text TEXT,
  ai_summary JSONB,
  status TEXT CHECK (status IN ('uploading', 'processing', 'completed', 'error')) DEFAULT 'uploading',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_policy_uploads_user_id ON public.policy_uploads(user_id);
CREATE INDEX idx_policy_uploads_status ON public.policy_uploads(status);
CREATE INDEX idx_policy_uploads_upload_time ON public.policy_uploads(upload_time);

-- Enable Row Level Security
ALTER TABLE public.policy_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own uploads
CREATE POLICY "Users can view own policy uploads" ON public.policy_uploads
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own uploads
CREATE POLICY "Users can insert own policy uploads" ON public.policy_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own uploads
CREATE POLICY "Users can update own policy uploads" ON public.policy_uploads
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own uploads
CREATE POLICY "Users can delete own policy uploads" ON public.policy_uploads
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.policy_uploads TO authenticated;
GRANT SELECT ON public.policy_uploads TO anon;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.policy_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at(); 