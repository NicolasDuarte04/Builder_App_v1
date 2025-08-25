-- Add analysis column to saved_policies to store structured analysis JSON
alter table if exists public.saved_policies
  add column if not exists analysis jsonb;


