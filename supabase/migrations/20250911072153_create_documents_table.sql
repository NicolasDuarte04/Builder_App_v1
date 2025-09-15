-- Migration: Create documents table
-- Purpose: Store documents linked to cases with text extraction and search

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    ref TEXT NOT NULL,
    text_extracted TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.documents IS 'Documents associated with cases';
COMMENT ON COLUMN public.documents.id IS 'Unique identifier for the document';
COMMENT ON COLUMN public.documents.case_id IS 'Reference to the associated case';
COMMENT ON COLUMN public.documents.kind IS 'Document type/kind';
COMMENT ON COLUMN public.documents.ref IS 'Document reference or path';
COMMENT ON COLUMN public.documents.text_extracted IS 'Extracted text content for searching';
COMMENT ON COLUMN public.documents.created_at IS 'Document creation timestamp';

-- Create indexes for performance
CREATE INDEX idx_documents_case_id ON public.documents(case_id);

-- Create Spanish text search configuration if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'spanish') THEN
        -- Spanish config should exist by default, but just in case
        RAISE NOTICE 'Spanish text search configuration not found';
    END IF;
END $$;

-- Add GIN index for Spanish text search on extracted text
CREATE INDEX idx_documents_text_extracted_gin ON public.documents 
    USING gin(to_tsvector('spanish', COALESCE(text_extracted, '')));

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (owner-only access via join to cases table)
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.documents TO authenticated;

-- Helper function for Spanish text search (optional)
CREATE OR REPLACE FUNCTION public.search_documents_spanish(search_query TEXT)
RETURNS TABLE(
    document_id UUID,
    case_id UUID,
    kind TEXT,
    ref TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.case_id,
        d.kind,
        d.ref,
        ts_rank(to_tsvector('spanish', COALESCE(d.text_extracted, '')), 
                plainto_tsquery('spanish', search_query)) AS rank
    FROM public.documents d
    WHERE to_tsvector('spanish', COALESCE(d.text_extracted, '')) @@ 
          plainto_tsquery('spanish', search_query)
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
