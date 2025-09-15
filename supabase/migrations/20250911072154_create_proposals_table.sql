-- Migration: Create proposals table
-- Purpose: Store proposals linked to cases

-- Create proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    url TEXT,
    pdf_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.proposals IS 'Proposals associated with cases';
COMMENT ON COLUMN public.proposals.id IS 'Unique identifier for the proposal';
COMMENT ON COLUMN public.proposals.case_id IS 'Reference to the associated case';
COMMENT ON COLUMN public.proposals.url IS 'External URL for the proposal';
COMMENT ON COLUMN public.proposals.pdf_path IS 'Storage path for PDF version';
COMMENT ON COLUMN public.proposals.created_at IS 'Proposal creation timestamp';

-- Create indexes for performance
CREATE INDEX idx_proposals_case_id ON public.proposals(case_id);

-- Enable Row Level Security
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (owner-only access via join to cases table)
CREATE POLICY "Users can view own proposals" ON public.proposals
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = proposals.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own proposals" ON public.proposals
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = proposals.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own proposals" ON public.proposals
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = proposals.case_id 
            AND cases.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = proposals.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own proposals" ON public.proposals
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = proposals.case_id 
            AND cases.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.proposals TO authenticated;
