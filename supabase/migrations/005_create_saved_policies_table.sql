-- Create saved_policies table
CREATE TABLE IF NOT EXISTS saved_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_name VARCHAR(255) NOT NULL,
  insurer_name VARCHAR(255),
  policy_type VARCHAR(100),
  priority VARCHAR(50) DEFAULT 'medium',
  pdf_url TEXT,
  storage_path TEXT,
  metadata JSONB DEFAULT '{}',
  extracted_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_saved_policies_user_id ON saved_policies(user_id);
CREATE INDEX idx_saved_policies_created_at ON saved_policies(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_policies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own saved policies" ON saved_policies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved policies" ON saved_policies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved policies" ON saved_policies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved policies" ON saved_policies
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_policies_updated_at BEFORE UPDATE
  ON saved_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();