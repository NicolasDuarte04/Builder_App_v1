-- Catalog: public.plans_v2 for Render Postgres
-- Idempotent: safe to run multiple times

create schema if not exists public;

create table if not exists public.plans_v2 (
  id text primary key,
  provider text,
  name text,
  name_en text,
  category text not null,
  country text,
  base_price numeric(14,2) not null,
  currency text not null,
  price_period text,
  external_link text,
  brochure_link text,
  benefits jsonb,
  benefits_en jsonb,
  tags jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill columns if missing (for legacy tables)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'plans_v2' and column_name = 'price_period'
  ) then
    alter table public.plans_v2 add column price_period text;
  end if;
end $$;

-- Ensure NOT NULL constraints for critical filters if no NULLs exist (idempotent)
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'plans_v2' and column_name = 'category' and is_nullable = 'YES'
  ) and not exists (select 1 from public.plans_v2 where category is null) then
    alter table public.plans_v2 alter column category set not null;
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'plans_v2' and column_name = 'currency' and is_nullable = 'YES'
  ) and not exists (select 1 from public.plans_v2 where currency is null) then
    alter table public.plans_v2 alter column currency set not null;
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'plans_v2' and column_name = 'base_price' and is_nullable = 'YES'
  ) and not exists (select 1 from public.plans_v2 where base_price is null) then
    alter table public.plans_v2 alter column base_price set not null;
  end if;
end $$;

-- Indices tuned for common filters in API
do $$ begin
  if not exists (select 1 from pg_class where relname = 'idx_plans_v2_category_currency') then
    create index idx_plans_v2_category_currency on public.plans_v2 (category, currency);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_class where relname = 'idx_plans_v2_category_currency_price') then
    create index idx_plans_v2_category_currency_price on public.plans_v2 (
      category, currency, base_price
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_class where relname = 'idx_plans_v2_tags_gin') then
    create index idx_plans_v2_tags_gin on public.plans_v2 using gin ((coalesce(tags, '[]'::jsonb)));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_class where relname = 'idx_plans_v2_benefits_gin') then
    create index idx_plans_v2_benefits_gin on public.plans_v2 using gin ((coalesce(benefits, '[]'::jsonb)));
  end if;
end $$;

-- Additional index optimized for price proximity ordering
do $$ begin
  if not exists (select 1 from pg_class where relname = 'idx_plans_v2_price_order') then
    create index idx_plans_v2_price_order on public.plans_v2 (category, currency, base_price);
  end if;
end $$;

-- Helpful extras
do $$ begin
  if not exists (select 1 from pg_class where relname = 'idx_plans_v2_country') then
    create index idx_plans_v2_country on public.plans_v2 (country);
  end if;
end $$;


