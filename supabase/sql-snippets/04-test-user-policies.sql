-- Test user's saved policies
-- Replace 'test@example.com' with actual user email
SELECT 
    sp.id,
    sp.custom_name,
    sp.insurer_name,
    sp.policy_type,
    sp.priority,
    sp.created_at,
    sp.pdf_url,
    jsonb_pretty(sp.metadata) as metadata,
    u.email as user_email
FROM saved_policies sp
JOIN users u ON sp.user_id = u.id
-- WHERE u.email = 'test@example.com'
ORDER BY sp.created_at DESC;