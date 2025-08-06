-- Check storage buckets and policies
SELECT 
    b.id as bucket_id,
    b.name as bucket_name,
    b.public,
    b.file_size_limit,
    b.allowed_mime_types,
    COUNT(p.id) as policy_count
FROM storage.buckets b
LEFT JOIN storage.policies p ON b.id = p.bucket_id
WHERE b.id = 'policy-documents'
GROUP BY b.id, b.name, b.public, b.file_size_limit, b.allowed_mime_types;