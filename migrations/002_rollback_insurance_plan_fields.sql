-- Rollback Migration: Remove added fields from insurance_plans table
-- Date: 2024-01-09
-- Purpose: Rollback script to remove fields added in 002_add_insurance_plan_fields.sql

-- Remove the added columns
ALTER TABLE insurance_plans
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS plan_name_en,
DROP COLUMN IF EXISTS plan_name_es,
DROP COLUMN IF EXISTS description_en,
DROP COLUMN IF EXISTS description_es,
DROP COLUMN IF EXISTS features,
DROP COLUMN IF EXISTS price_range,
DROP COLUMN IF EXISTS target_demographic,
DROP COLUMN IF EXISTS monthly_premium,
DROP COLUMN IF EXISTS deductible,
DROP COLUMN IF EXISTS max_age,
DROP COLUMN IF EXISTS min_age,
DROP COLUMN IF EXISTS requires_medical,
DROP COLUMN IF EXISTS coverage_type,
DROP COLUMN IF EXISTS partner_priority; 