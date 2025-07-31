-- Add enhanced policy metadata fields to policy_uploads table
-- This migration adds fields for better policy management and user experience

ALTER TABLE policy_uploads 
ADD COLUMN IF NOT EXISTS insurer_name TEXT,
ADD COLUMN IF NOT EXISTS insurer_contact TEXT,
ADD COLUMN IF NOT EXISTS emergency_lines TEXT[],
ADD COLUMN IF NOT EXISTS policy_start_date DATE,
ADD COLUMN IF NOT EXISTS policy_end_date DATE,
ADD COLUMN IF NOT EXISTS policy_link TEXT,
ADD COLUMN IF NOT EXISTS renewal_reminders BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_obligations TEXT[],
ADD COLUMN IF NOT EXISTS compliance_notes TEXT[],
ADD COLUMN IF NOT EXISTS coverage_geography TEXT DEFAULT 'Colombia',
ADD COLUMN IF NOT EXISTS claim_instructions TEXT[],
ADD COLUMN IF NOT EXISTS analysis_language TEXT DEFAULT 'Spanish';

-- Add comments for documentation
COMMENT ON COLUMN policy_uploads.insurer_name IS 'Name of the insurance company';
COMMENT ON COLUMN policy_uploads.insurer_contact IS 'Contact information for the insurer';
COMMENT ON COLUMN policy_uploads.emergency_lines IS 'Emergency contact numbers';
COMMENT ON COLUMN policy_uploads.policy_start_date IS 'Policy effective start date';
COMMENT ON COLUMN policy_uploads.policy_end_date IS 'Policy expiration date';
COMMENT ON COLUMN policy_uploads.policy_link IS 'Link or reference to the policy document';
COMMENT ON COLUMN policy_uploads.renewal_reminders IS 'Whether to send renewal reminders';
COMMENT ON COLUMN policy_uploads.legal_obligations IS 'Legal obligations mentioned in the policy';
COMMENT ON COLUMN policy_uploads.compliance_notes IS 'Compliance requirements and notes';
COMMENT ON COLUMN policy_uploads.coverage_geography IS 'Geographic coverage area';
COMMENT ON COLUMN policy_uploads.claim_instructions IS 'Instructions for filing claims';
COMMENT ON COLUMN policy_uploads.analysis_language IS 'Language used in the analysis response'; 