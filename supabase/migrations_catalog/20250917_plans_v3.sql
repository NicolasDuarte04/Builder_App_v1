-- Idempotent and safe to run multiple times

-- 1) Create plans_v3 schema and core tables
create extension if not exists pgcrypto;
create schema if not exists plans_v3;

-- providers
create table if not exists plans_v3.providers (
  id uuid primary key default gen_random_uuid(),
  provider_slug text not null unique,
  display_name text not null,
  official_domains text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- plans
create table if not exists plans_v3.plans (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references plans_v3.providers(id) on delete cascade,
  plan_slug text not null,
  display_name text not null,
  category_slug text not null check (category_slug in ('autos','salud')),
  price_currency text,
  price_min numeric(14,2),
  pricing_model text check (pricing_model in ('quote','monthly','annual')),
  geo_scope text[] default '{CO}',
  target_personas text[] default '{}',
  deductible text,
  copay text,
  waiting_period_days int,
  source_primary_url text not null,
  external_purchase_url text,
  last_verified_at timestamptz,
  tags text[],
  completeness_tier text check (completeness_tier in ('gold','silver','bronze')),
  field_sources_json jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, plan_slug)
);
create index if not exists idx_plans_v3_provider on plans_v3.plans(provider_id);
create index if not exists idx_plans_v3_category on plans_v3.plans(category_slug);

-- benefits_master (canonical benefits per category)
create table if not exists plans_v3.benefits_master (
  id bigserial primary key,
  category_slug text not null check (category_slug in ('autos','salud')),
  benefit_code text not null,
  name text,
  description text,
  created_at timestamptz not null default now(),
  unique (category_slug, benefit_code)
);

-- plan_benefits (per plan canonical benefits)
create table if not exists plans_v3.plan_benefits (
  id bigserial primary key,
  plan_id uuid not null references plans_v3.plans(id) on delete cascade,
  benefit_code text not null,
  category_slug text not null,
  value_json jsonb,
  created_at timestamptz not null default now(),
  unique (plan_id, benefit_code)
);
create index if not exists idx_plan_benefits_plan on plans_v3.plan_benefits(plan_id);

-- plan_prices (time series of captured prices)
create table if not exists plans_v3.plan_prices (
  id bigserial primary key,
  plan_id uuid not null references plans_v3.plans(id) on delete cascade,
  captured_at timestamptz not null,
  price_currency text not null,
  price numeric(14,2) not null,
  source_url text,
  unique (plan_id, captured_at, price_currency, price)
);
create index if not exists idx_plan_prices_plan on plans_v3.plan_prices(plan_id);

-- plan_sources (source links & captures)
create table if not exists plans_v3.plan_sources (
  id bigserial primary key,
  plan_id uuid not null references plans_v3.plans(id) on delete cascade,
  source_type text not null,
  url text not null,
  captured_at timestamptz,
  unique (plan_id, source_type, url, captured_at)
);
create index if not exists idx_plan_sources_plan on plans_v3.plan_sources(plan_id);

-- 2) Compatibility view for API: public.plans_v2
--    Projects normalized v3 data to legacy v2 search contract
do $$ begin
  -- If a TABLE named public.plans_v2 exists, drop it to allow creating a VIEW
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'plans_v2'
  ) then
    execute 'drop table public.plans_v2';
  end if;
exception when undefined_table then
  -- ignore
end $$;

create or replace view public.plans_v2 as
with base as (
  select
    p.id::text as id,
    prov.display_name as provider,
    p.display_name as name,
    p.display_name as name_en,
    p.category_slug as category,
    case when array_position(coalesce(p.geo_scope, '{CO}'), 'CO') is not null then 'CO' else coalesce(p.geo_scope[1], 'CO') end as country,
    p.price_min as base_price,
    p.price_currency as currency,
    p.external_purchase_url as external_link,
    null::text as brochure_link,
    p.last_verified_at,
    p.source_primary_url as source_url,
    coalesce(to_jsonb(coalesce(p.tags, '{}'::text[])), '[]'::jsonb) as tags
  from plans_v3.plans p
  join plans_v3.providers prov on prov.id = p.provider_id
  where p.is_active = true
)
select
  b.id,
  b.provider,
  b.name,
  b.name_en,
  b.category,
  b.country,
  b.base_price,
  b.currency,
  b.external_link,
  b.brochure_link,
  b.last_verified_at,
  b.source_url,
  -- benefits as jsonb array of canonical codes
  coalesce(
    (
      select jsonb_agg(pb.benefit_code order by pb.benefit_code)
      from plans_v3.plan_benefits pb
      where pb.plan_id = (b.id::uuid)
    ), '[]'::jsonb
  ) as benefits,
  coalesce(
    (
      select jsonb_agg(pb2.benefit_code order by pb2.benefit_code)
      from plans_v3.plan_benefits pb2
      where pb2.plan_id = (b.id::uuid)
    ), '[]'::jsonb
  ) as benefits_en,
  b.tags as tags
from base b;

comment on view public.plans_v2 is 'Compatibility view exposing normalized plans_v3 data for /api/plans_v2/search';


