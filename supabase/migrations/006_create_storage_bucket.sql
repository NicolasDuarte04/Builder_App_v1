-- Create storage bucket for policy documents
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'policy-documents',
  'policy-documents',
  false, -- Private bucket
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage bucket
CREATE POLICY "Users can upload own policy documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'policy-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own policy documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'policy-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own policy documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'policy-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );