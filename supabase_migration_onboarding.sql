-- Create onboarding_responses table
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  insurance_type TEXT NOT NULL,
  age_range TEXT NOT NULL,
  family_status TEXT NOT NULL,
  location TEXT NOT NULL,
  budget_range TEXT NOT NULL,
  current_insurance TEXT NOT NULL,
  priority TEXT NOT NULL,
  email_quotes BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_insurance_type ON onboarding_responses(insurance_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_location ON onboarding_responses(location);

-- Enable RLS (Row Level Security)
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own responses
CREATE POLICY "Users can view their own onboarding responses" ON onboarding_responses
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own responses
CREATE POLICY "Users can insert their own onboarding responses" ON onboarding_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own responses
CREATE POLICY "Users can update their own onboarding responses" ON onboarding_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_onboarding_responses_updated_at 
  BEFORE UPDATE ON onboarding_responses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 