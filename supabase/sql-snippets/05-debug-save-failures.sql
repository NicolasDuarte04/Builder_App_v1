-- Debug save failures - Check user exists and has proper ID
WITH user_check AS (
    SELECT 
        id,
        email,
        created_at,
        CASE 
            WHEN id IS NULL THEN 'Missing ID'
            WHEN email IS NULL THEN 'Missing email'
            ELSE 'Valid'
        END as status
    FROM users
    -- WHERE email = 'your-email@example.com'
)
SELECT * FROM user_check;

-- Check if RLS is blocking inserts
SELECT 
    current_user,
    auth.uid() as auth_user_id,
    EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid()
    ) as user_exists_with_auth_id;