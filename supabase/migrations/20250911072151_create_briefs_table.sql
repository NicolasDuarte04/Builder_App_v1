-- Migration: Create briefs table
-- Purpose: Store user briefs with session context and locale

-- Create briefs table
CREATE TABLE IF NOT EXISTS public.briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'es',
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.briefs IS 'User briefs with session tracking and locale support';
COMMENT ON COLUMN public.briefs.id IS 'Unique identifier for the brief';
COMMENT ON COLUMN public.briefs.user_id IS 'Owner user ID from auth.users';
COMMENT ON COLUMN public.briefs.session_id IS 'Session identifier for tracking';
COMMENT ON COLUMN public.briefs.locale IS 'Locale code (default: es for Spanish)';
COMMENT ON COLUMN public.briefs.data IS 'Brief data in JSON format';
COMMENT ON COLUMN public.briefs.created_at IS 'Brief creation timestamp';
COMMENT ON COLUMN public.briefs.updated_at IS 'Last modification timestamp';

-- Create indexes for performance
CREATE INDEX idx_briefs_user_id ON public.briefs(user_id);
CREATE INDEX idx_briefs_session_id ON public.briefs(session_id);

-- Enable Row Level Security
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (owner-only access)
CREATE POLICY "Users can view own briefs" ON public.briefs
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefs" ON public.briefs
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own briefs" ON public.briefs
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own briefs" ON public.briefs
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.briefs TO authenticated;

-- Create or update the trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.briefs;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.briefs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
