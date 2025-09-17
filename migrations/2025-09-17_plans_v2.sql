-- Ensure schema and contract for public.plans_v2 used by API
create schema if not exists public;

-- Prefer existing canonical table; create if missing (non-destructive)
create table if not exists public.plans_v2 (
  id text primary key,
  provider text,
  name text,
  name_en text,
  category text,
  country text,
  base_price numeric(14,2),
  currency text,
  external_link text,
  brochure_link text,
  benefits jsonb,
  benefits_en jsonb,
  tags jsonb
);

create index if not exists idx_plans_v2_category on public.plans_v2 (category);
create index if not exists idx_plans_v2_country on public.plans_v2 (country);
create index if not exists idx_plans_v2_tags_gin on public.plans_v2 using gin (tags);


