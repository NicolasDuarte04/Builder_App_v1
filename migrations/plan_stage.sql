-- Staging table + view for dry-run and future upsert (do not execute here)

-- 1) staging table (truncate between runs)
create table if not exists public.plans_stage (
  id bigserial primary key,
  product text not null,
  country text not null,
  carrier_name text not null,
  plan_name text not null,
  variant text,
  currency text not null,
  premium_amount_month numeric not null,
  coverage_json jsonb not null,
  limits_json jsonb not null,
  deductibles_json jsonb not null,
  tags text,
  source_url text not null,
  notes text,
  ingest_batch_id text not null,
  created_at timestamptz default now()
);

-- Natural key index to detect dupes inside staging and vs production
create index if not exists idx_plans_stage_nk on public.plans_stage
(product, country, carrier_name, plan_name, coalesce(variant,'standard'));

-- 2) helper view to compare against production
create or replace view public.plans_stage_vs_prod as
select
  s.*,
  case when p.id is null then true else false end as is_new,
  p.id as prod_id
from public.plans_stage s
left join public.plans_v2 p
  on p.category = s.product
 and p.country = s.country
 and p.provider = s.carrier_name
 and p.name = s.plan_name;

-- 3) write procedure (DO NOT CALL YET IN THIS PR)
/*
create or replace function public.plans_stage_commit(batch_id text)
returns table(inserted int, updated int) language plpgsql as $$
declare
  v_inserted int := 0;
  v_updated int := 0;
begin
  -- insert new
  insert into public.plans_v2 (product,country,carrier_name,plan_name,variant,currency,premium_amount_month,coverage_json,limits_json,deductibles_json,tags,source_url,notes,created_at,updated_at)
  select product,country,carrier_name,plan_name,variant,currency,premium_amount_month,coverage_json,limits_json,deductibles_json,tags,source_url,notes, now(), now()
  from public.plans_stage_vs_prod
  where ingest_batch_id = batch_id and is_new = true;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- update changed (optional: compare json + premium/currency)
  update public.plans_v2 p set
    currency = s.currency,
    premium_amount_month = s.premium_amount_month,
    coverage_json = s.coverage_json,
    limits_json = s.limits_json,
    deductibles_json = s.deductibles_json,
    tags = s.tags,
    source_url = s.source_url,
    notes = s.notes,
    updated_at = now()
  from public.plans_stage_vs_prod s
  where s.ingest_batch_id = batch_id
    and s.is_new = false
    and p.id = s.prod_id
    and (
      p.currency <> s.currency or
      p.premium_amount_month <> s.premium_amount_month or
      p.coverage_json <> s.coverage_json or
      p.limits_json <> s.limits_json or
      p.deductibles_json <> s.deductibles_json or
      coalesce(p.tags,'') <> coalesce(s.tags,'') or
      coalesce(p.source_url,'') <> coalesce(s.source_url,'') or
      coalesce(p.notes,'') <> coalesce(s.notes,'')
    );
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  return query select v_inserted, v_updated;
end $$;
*/


