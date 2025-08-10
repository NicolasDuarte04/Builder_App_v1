-- Ensure policy_uploads table exists with correct structure
-- This is a safe migration that creates the table if it doesn't exist

CREATE TABLE IF NOT EXISTS policy_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT,
  storage_path TEXT,
  pdf_url TEXT,
  extraction_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Legacy columns (may not be used anymore but kept for compatibility)
  file_path TEXT,
  extracted_text TEXT,
  ai_summary JSONB,
  status TEXT,
  error_message TEXT,
  upload_time TIMESTAMPTZ DEFAULT NOW(),
  
  -- Enhanced metadata fields
  insurer_name TEXT,
  insurer_contact TEXT,
  emergency_lines TEXT[],
  policy_start_date DATE,
  policy_end_date DATE,
  policy_link TEXT,
  renewal_reminders BOOLEAN DEFAULT false,
  legal_obligations TEXT[],
  compliance_notes TEXT[],
  coverage_geography TEXT DEFAULT 'Colombia',
  claim_instructions TEXT[],
  analysis_language TEXT DEFAULT 'Spanish'
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_policy_uploads_user_id ON policy_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_uploads_created_at ON policy_uploads(created_at DESC);

-- Enable RLS
ALTER TABLE policy_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only see and modify their own uploads)
CREATE POLICY IF NOT EXISTS "Users can view own policy uploads" 
  ON policy_uploads FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own policy uploads" 
  ON policy_uploads FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own policy uploads" 
  ON policy_uploads FOR UPDATE 
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own policy uploads" 
  ON policy_uploads FOR DELETE 
  USING (auth.uid()::text = user_id);

-- Grant permissions to authenticated users
GRANT ALL ON policy_uploads TO authenticated;
GRANT USAGE ON SEQUENCE policy_uploads_id_seq TO authenticated;

-- Add comment
COMMENT ON TABLE policy_uploads IS 'Stores uploaded policy PDFs and their analysis results';
