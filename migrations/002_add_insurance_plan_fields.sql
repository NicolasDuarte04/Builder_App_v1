-- Migration: Add nullable fields to insurance_plans table
-- Date: 2024-01-09
-- Purpose: Extend schema for multilingual support, advanced filtering, and partner features

-- Add nullable columns to support enhanced insurance plan features
ALTER TABLE insurance_plans
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS plan_name_en VARCHAR,
ADD COLUMN IF NOT EXISTS plan_name_es VARCHAR,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT,
ADD COLUMN IF NOT EXISTS features JSON,
ADD COLUMN IF NOT EXISTS price_range VARCHAR,
ADD COLUMN IF NOT EXISTS target_demographic TEXT[],
ADD COLUMN IF NOT EXISTS monthly_premium NUMERIC,
ADD COLUMN IF NOT EXISTS deductible NUMERIC,
ADD COLUMN IF NOT EXISTS max_age INTEGER,
ADD COLUMN IF NOT EXISTS min_age INTEGER,
ADD COLUMN IF NOT EXISTS requires_medical BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS coverage_type VARCHAR,
ADD COLUMN IF NOT EXISTS partner_priority INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN insurance_plans.tags IS 'Array of tags for filtering (e.g., "más barato", "mejor cobertura")';
COMMENT ON COLUMN insurance_plans.plan_name_en IS 'English plan name for internationalization';
COMMENT ON COLUMN insurance_plans.plan_name_es IS 'Spanish plan name for internationalization';
COMMENT ON COLUMN insurance_plans.description_en IS 'English description of the plan';
COMMENT ON COLUMN insurance_plans.description_es IS 'Spanish description of the plan';
COMMENT ON COLUMN insurance_plans.features IS 'JSON array of plan features';
COMMENT ON COLUMN insurance_plans.price_range IS 'Price range description (e.g., "$50-$100/month")';
COMMENT ON COLUMN insurance_plans.target_demographic IS 'Array of target demographics';
COMMENT ON COLUMN insurance_plans.monthly_premium IS 'Monthly premium amount';
COMMENT ON COLUMN insurance_plans.deductible IS 'Deductible amount';
COMMENT ON COLUMN insurance_plans.max_age IS 'Maximum age for eligibility';
COMMENT ON COLUMN insurance_plans.min_age IS 'Minimum age for eligibility';
COMMENT ON COLUMN insurance_plans.requires_medical IS 'Whether medical exam is required';
COMMENT ON COLUMN insurance_plans.coverage_type IS 'Type of coverage (salud, dental, auto, etc.)';
COMMENT ON COLUMN insurance_plans.partner_priority IS 'Display priority for partner plans (higher = more prominent)'; 