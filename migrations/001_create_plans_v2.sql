-- Idempotent creation of plans_v2 table and indexes
CREATE TABLE IF NOT EXISTS public.plans_v2 (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL,
  country TEXT NOT NULL,
  base_price NUMERIC(14,2) NOT NULL CHECK (base_price > 0),
  currency TEXT NOT NULL CHECK (currency IN ('COP','MXN','EUR','USD')),
  external_link TEXT NOT NULL,
  brochure_link TEXT,
  benefits JSONB NOT NULL,
  benefits_en JSONB NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Ensure optional numeric age columns exist for ETL compatibility
ALTER TABLE IF EXISTS public.plans_v2 ADD COLUMN IF NOT EXISTS min_age NUMERIC;
ALTER TABLE IF EXISTS public.plans_v2 ADD COLUMN IF NOT EXISTS max_age NUMERIC;

CREATE INDEX IF NOT EXISTS plans_v2_cat_idx      ON public.plans_v2 (category);
CREATE INDEX IF NOT EXISTS plans_v2_country_idx  ON public.plans_v2 (country);
CREATE INDEX IF NOT EXISTS plans_v2_tags_gin     ON public.plans_v2 USING GIN (tags);


