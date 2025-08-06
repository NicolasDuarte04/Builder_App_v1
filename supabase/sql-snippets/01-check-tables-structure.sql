-- Check all tables structure
SELECT 
    t.table_name,
    COUNT(c.column_name) as column_count,
    CASE 
        WHEN t.table_name = 'users' THEN 'Authentication table'
        WHEN t.table_name = 'policy_uploads' THEN 'PDF upload tracking'
        WHEN t.table_name = 'saved_policies' THEN 'Saved policy analyses'
        ELSE 'Unknown'
    END as purpose
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
AND t.table_name IN ('users', 'policy_uploads', 'saved_policies')
GROUP BY t.table_name
ORDER BY t.table_name;