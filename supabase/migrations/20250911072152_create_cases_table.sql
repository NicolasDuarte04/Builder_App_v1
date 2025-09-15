-- Migration: Create cases table
-- Purpose: Store cases linked to briefs with status tracking

-- Create cases table
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    reminders JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.cases IS 'Cases linked to briefs with status and timeline tracking';
COMMENT ON COLUMN public.cases.id IS 'Unique identifier for the case';
COMMENT ON COLUMN public.cases.user_id IS 'Owner user ID from auth.users';
COMMENT ON COLUMN public.cases.brief_id IS 'Reference to the associated brief';
COMMENT ON COLUMN public.cases.status IS 'Current case status';
COMMENT ON COLUMN public.cases.timeline IS 'Case timeline events in JSON array format';
COMMENT ON COLUMN public.cases.reminders IS 'Case reminders in JSON array format';
COMMENT ON COLUMN public.cases.created_at IS 'Case creation timestamp';
COMMENT ON COLUMN public.cases.updated_at IS 'Last modification timestamp';

-- Create indexes for performance
CREATE INDEX idx_cases_user_id ON public.cases(user_id);
CREATE INDEX idx_cases_brief_id ON public.cases(brief_id);

-- Enable Row Level Security
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (owner-only access)
CREATE POLICY "Users can view own cases" ON public.cases
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases" ON public.cases
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases" ON public.cases
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases" ON public.cases
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.cases TO authenticated;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.cases;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
