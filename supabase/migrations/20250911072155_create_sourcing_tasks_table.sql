-- Migration: Create sourcing_tasks table
-- Purpose: Store sourcing tasks linked to cases

-- Create sourcing_tasks table
CREATE TABLE IF NOT EXISTS public.sourcing_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.sourcing_tasks IS 'Sourcing tasks associated with cases';
COMMENT ON COLUMN public.sourcing_tasks.id IS 'Unique identifier for the sourcing task';
COMMENT ON COLUMN public.sourcing_tasks.case_id IS 'Reference to the associated case';
COMMENT ON COLUMN public.sourcing_tasks.target IS 'Target entity or objective for sourcing';
COMMENT ON COLUMN public.sourcing_tasks.status IS 'Current task status';
COMMENT ON COLUMN public.sourcing_tasks.created_at IS 'Task creation timestamp';
COMMENT ON COLUMN public.sourcing_tasks.updated_at IS 'Last modification timestamp';

-- Create indexes for performance
CREATE INDEX idx_sourcing_tasks_case_id ON public.sourcing_tasks(case_id);

-- Enable Row Level Security
ALTER TABLE public.sourcing_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (owner-only access via join to cases table)
CREATE POLICY "Users can view own sourcing tasks" ON public.sourcing_tasks
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = sourcing_tasks.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own sourcing tasks" ON public.sourcing_tasks
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = sourcing_tasks.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own sourcing tasks" ON public.sourcing_tasks
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = sourcing_tasks.case_id 
            AND cases.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = sourcing_tasks.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own sourcing tasks" ON public.sourcing_tasks
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = sourcing_tasks.case_id 
            AND cases.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.sourcing_tasks TO authenticated;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.sourcing_tasks;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.sourcing_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
