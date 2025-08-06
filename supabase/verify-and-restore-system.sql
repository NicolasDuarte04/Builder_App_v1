-- =====================================================
-- BRIKI INSURANCE SYSTEM - VERIFICATION & RESTORATION
-- =====================================================
-- This script verifies the database structure and recreates
-- any missing elements for the insurance policy system

-- 1. VERIFY USERS TABLE
-- =====================================================
SELECT 'Checking users table...' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. VERIFY POLICY_UPLOADS TABLE
-- =====================================================
SELECT 'Checking policy_uploads table...' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'policy_uploads'
ORDER BY ordinal_position;

-- 3. VERIFY SAVED_POLICIES TABLE
-- =====================================================
SELECT 'Checking saved_policies table...' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'saved_policies'
ORDER BY ordinal_position;

-- 4. VERIFY STORAGE BUCKETS
-- =====================================================
SELECT 'Checking storage buckets...' as status;
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'policy-documents';

-- 5. VERIFY ROW LEVEL SECURITY
-- =====================================================
SELECT 'Checking RLS policies...' as status;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'policy_uploads', 'saved_policies')
ORDER BY tablename, policyname;

-- 6. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT 'Checking foreign key constraints...' as status;
SELECT
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
AND tc.table_schema = 'public'
AND tc.table_name IN ('saved_policies', 'policy_uploads');

-- 7. COUNT RECORDS IN EACH TABLE
-- =====================================================
SELECT 'Counting records...' as status;
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'policy_uploads' as table_name, COUNT(*) as record_count FROM policy_uploads
UNION ALL
SELECT 'saved_policies' as table_name, COUNT(*) as record_count FROM saved_policies;

-- 8. CHECK INDEXES
-- =====================================================
SELECT 'Checking indexes...' as status;
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'policy_uploads', 'saved_policies')
ORDER BY tablename, indexname;

-- 9. VERIFY TRIGGERS
-- =====================================================
SELECT 'Checking triggers...' as status;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('users', 'policy_uploads', 'saved_policies');

-- 10. SAMPLE DATA CHECK (First 5 records from each table)
-- =====================================================
SELECT 'Sample data from users table:' as status;
SELECT * FROM users LIMIT 5;

SELECT 'Sample data from policy_uploads table:' as status;
SELECT id, user_id, file_name, status, created_at FROM policy_uploads LIMIT 5;

SELECT 'Sample data from saved_policies table:' as status;
SELECT id, user_id, custom_name, insurer_name, created_at FROM saved_policies LIMIT 5;

-- =====================================================
-- USEFUL QUERIES FOR DEBUGGING
-- =====================================================

-- Find all policies for a specific user (replace with actual email)
-- SELECT sp.* 
-- FROM saved_policies sp
-- JOIN users u ON sp.user_id = u.id
-- WHERE u.email = 'user@example.com';

-- Check policy uploads with their analysis status
-- SELECT 
--     pu.id,
--     pu.file_name,
--     pu.status,
--     pu.created_at,
--     u.email as user_email
-- FROM policy_uploads pu
-- JOIN users u ON pu.user_id = u.id
-- ORDER BY pu.created_at DESC;

-- Find policies with missing or incomplete data
-- SELECT * FROM saved_policies 
-- WHERE insurer_name IS NULL 
-- OR policy_type IS NULL
-- OR extracted_data = '{}'::jsonb;