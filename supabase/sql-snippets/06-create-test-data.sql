-- Create test data for development
-- WARNING: Only use in development environment

-- First, ensure you have a test user
INSERT INTO users (email, name, password)
VALUES ('test@example.com', 'Test User', 'oauth_user')
ON CONFLICT (email) DO NOTHING;

-- Get the test user ID
WITH test_user AS (
    SELECT id FROM users WHERE email = 'test@example.com'
)
-- Insert a test saved policy
INSERT INTO saved_policies (
    user_id,
    custom_name,
    insurer_name,
    policy_type,
    priority,
    metadata,
    extracted_data
)
SELECT 
    id,
    'Test Policy - Auto Insurance',
    'Test Insurance Company',
    'Auto',
    'medium',
    '{"test": true, "created_by": "sql_snippet"}'::jsonb,
    '{"policyType": "Auto Insurance", "premium": {"amount": 1000000, "currency": "COP"}}'::jsonb
FROM test_user
WHERE NOT EXISTS (
    SELECT 1 FROM saved_policies sp 
    WHERE sp.user_id = test_user.id 
    AND sp.custom_name = 'Test Policy - Auto Insurance'
);

-- Verify the insert
SELECT * FROM saved_policies 
WHERE custom_name = 'Test Policy - Auto Insurance';