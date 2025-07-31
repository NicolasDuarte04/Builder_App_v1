-- Migration: Add unique constraint to insurance_plans table
-- Date: 2025-01-20
-- Purpose: Prevent duplicate insurance plans based on name and provider combination

-- First, let's check if there are any duplicates (there shouldn't be)
SELECT name, provider, COUNT(*) as duplicate_count
FROM insurance_plans
GROUP BY name, provider
HAVING COUNT(*) > 1;

-- Add the unique constraint
ALTER TABLE insurance_plans
ADD CONSTRAINT unique_insurance_plan_name_provider 
UNIQUE (name, provider);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT unique_insurance_plan_name_provider ON insurance_plans 
IS 'Ensures each insurance plan name is unique per provider to prevent duplicate entries';

-- Verify the constraint was added
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'insurance_plans'::regclass
AND conname = 'unique_insurance_plan_name_provider'; 