-- Fix the foreign key constraint to reference public.users instead of auth.users

-- First, drop the existing constraint if it exists
ALTER TABLE public.policy_uploads 
DROP CONSTRAINT IF EXISTS policy_uploads_user_id_fkey;

-- Add the correct foreign key constraint pointing to public.users
ALTER TABLE public.policy_uploads 
ADD CONSTRAINT policy_uploads_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- Verify the constraint was created correctly
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='policy_uploads'; 