-- Check if the user exists in auth.users
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE id = '5c004a37-525c-4a93-a1f6-ba436ae4c75b';

-- Also check if there are any policy_uploads for this user
SELECT 
    COUNT(*) as upload_count
FROM public.policy_uploads 
WHERE user_id = '5c004a37-525c-4a93-a1f6-ba436ae4c75b'; 