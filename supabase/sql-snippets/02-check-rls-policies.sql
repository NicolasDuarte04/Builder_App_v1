-- Check Row Level Security policies
SELECT 
    tablename as table,
    policyname as policy,
    permissive,
    cmd as operation,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'policy_uploads', 'saved_policies')
ORDER BY tablename, cmd;