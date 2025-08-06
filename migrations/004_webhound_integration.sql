-- Migration: WebHound Integration for Insurance Plans
-- Date: 2025-01-17
-- Purpose: Add WebHound-specific fields and improve multilingual support

-- Add new columns for WebHound data
ALTER TABLE insurance_plans
-- Link management
ADD COLUMN IF NOT EXISTS quote_link VARCHAR,
ADD COLUMN IF NOT EXISTS quote_link_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS brochure_link_checked_at TIMESTAMP,

-- Multilingual improvements
ADD COLUMN IF NOT EXISTS provider_es VARCHAR,
ADD COLUMN IF NOT EXISTS provider_en VARCHAR,
ADD COLUMN IF NOT EXISTS benefits_en TEXT[],

-- Data source tracking
ADD COLUMN IF NOT EXISTS data_source VARCHAR DEFAULT 'legacy',
ADD COLUMN IF NOT EXISTS webhound_id VARCHAR,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,

-- Preserve legacy field
ADD COLUMN IF NOT EXISTS legacy_link VARCHAR;

-- Migrate existing external_link to legacy_link if needed
UPDATE insurance_plans 
SET legacy_link = external_link 
WHERE legacy_link IS NULL AND external_link IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_insurance_plans_data_source ON insurance_plans(data_source);
CREATE INDEX IF NOT EXISTS idx_insurance_plans_webhound_id ON insurance_plans(webhound_id);
CREATE INDEX IF NOT EXISTS idx_insurance_plans_quote_link_checked ON insurance_plans(quote_link_checked_at);

-- Add comments for documentation
COMMENT ON COLUMN insurance_plans.quote_link IS 'Direct link to insurance quote page (validated by WebHound)';
COMMENT ON COLUMN insurance_plans.quote_link_checked_at IS 'Last validation timestamp for quote link';
COMMENT ON COLUMN insurance_plans.brochure_link_checked_at IS 'Last validation timestamp for brochure link';
COMMENT ON COLUMN insurance_plans.provider_es IS 'Provider name in Spanish';
COMMENT ON COLUMN insurance_plans.provider_en IS 'Provider name in English';
COMMENT ON COLUMN insurance_plans.benefits_en IS 'Benefits array in English';
COMMENT ON COLUMN insurance_plans.data_source IS 'Data origin: webhound, manual, legacy';
COMMENT ON COLUMN insurance_plans.webhound_id IS 'Unique identifier from WebHound dataset';
COMMENT ON COLUMN insurance_plans.last_synced_at IS 'Last synchronization with WebHound';
COMMENT ON COLUMN insurance_plans.legacy_link IS 'Preserved external_link for backward compatibility';

-- Create a view for backward compatibility
CREATE OR REPLACE VIEW insurance_plans_legacy AS
SELECT 
    *,
    COALESCE(quote_link, legacy_link) as external_link
FROM insurance_plans;

COMMENT ON VIEW insurance_plans_legacy IS 'Backward-compatible view maintaining external_link field';