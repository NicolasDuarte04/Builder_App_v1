-- Create client-information table for lead generation
CREATE TABLE IF NOT EXISTS "client-information" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  company VARCHAR(255) NOT NULL,
  website VARCHAR(255) NOT NULL,
  employees VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_information_email ON "client-information"(email);
CREATE INDEX IF NOT EXISTS idx_client_information_company ON "client-information"(company);
CREATE INDEX IF NOT EXISTS idx_client_information_created_at ON "client-information"(created_at);
CREATE INDEX IF NOT EXISTS idx_client_information_status ON "client-information"(status);

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE "client-information" ENABLE ROW LEVEL SECURITY;

-- Create a policy for service role access (adjust as needed for your security requirements)
-- CREATE POLICY "Service role can manage client information" ON "client-information"
--   FOR ALL USING (auth.role() = 'service_role');

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_information_updated_at 
    BEFORE UPDATE ON "client-information" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
