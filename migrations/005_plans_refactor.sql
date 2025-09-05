-- Migration: Plans Schema Refactor
-- This migration creates a new normalized schema for insurance plans
-- Run this in phases to minimize disruption

-- Phase 1: Create new schema tables
-- ===================================

-- 1. Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE CHECK (country_code ~ '^[A-Z]{2}$'),
  country_name TEXT NOT NULL,
  country_name_es TEXT,
  country_name_en TEXT,
  currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','MXN','EUR','USD')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create carriers table (insurance companies)
CREATE TABLE IF NOT EXISTS carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_es TEXT,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  official_domain TEXT,
  country TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create products table (insurance product types)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_es TEXT,
  name_en TEXT,
  type TEXT NOT NULL CHECK (type IN ('auto','home','health','life','business','travel','pet','education','other')),
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  description_es TEXT,
  description_en TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create plans table (canonical plan records)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  plan_code TEXT, -- Vendor-specific plan code
  is_active BOOLEAN NOT NULL DEFAULT true,
  data_source TEXT NOT NULL DEFAULT 'manual' CHECK (data_source IN ('manual','webhound','api','legacy')),
  external_id TEXT, -- ID from external system
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(carrier_id, product_id, plan_code)
);

-- 5. Create plan_versions table (price & coverage changes)
CREATE TABLE IF NOT EXISTS plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  version INT NOT NULL,
  name TEXT NOT NULL,
  name_es TEXT,
  name_en TEXT,
  description TEXT,
  description_es TEXT,
  description_en TEXT,
  
  -- Pricing
  premium_amount NUMERIC(12,2) CHECK (premium_amount >= 0),
  premium_interval TEXT CHECK (premium_interval IN ('month','year','one_time')),
  currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','MXN','EUR','USD')),
  
  -- Coverage
  coverage_amount NUMERIC(12,2) CHECK (coverage_amount >= 0),
  deductible NUMERIC(12,2) CHECK (deductible >= 0),
  max_age INTEGER CHECK (max_age > 0),
  min_age INTEGER CHECK (min_age >= 0),
  requires_medical BOOLEAN DEFAULT false,
  
  -- Features
  benefits JSONB DEFAULT '[]'::jsonb,
  benefits_en JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '{}'::jsonb,
  
  -- Validity
  effective_from DATE,
  effective_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(plan_id, version)
);

-- 6. Create plan_localizations table (language-specific content)
CREATE TABLE IF NOT EXISTS plan_localizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en','es')),
  name TEXT NOT NULL,
  description TEXT,
  marketing_copy TEXT,
  benefits TEXT[],
  tags TEXT[],
  
  UNIQUE(plan_id, locale)
);

-- 7. Create plan_marketing table (promotional & display)
CREATE TABLE IF NOT EXISTS plan_marketing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  -- Display
  display_name TEXT,
  display_description TEXT,
  badge TEXT CHECK (badge IN ('popular','best_value','new','featured')),
  rank_score INTEGER DEFAULT 0,
  
  -- Links
  quote_link TEXT,
  brochure_link TEXT,
  external_link TEXT,
  
  -- Targeting
  target_demographic TEXT[],
  price_range TEXT,
  partner_priority INTEGER DEFAULT 0,
  
  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create plan_availability table (regional availability)
CREATE TABLE IF NOT EXISTS plan_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id),
  is_available BOOLEAN NOT NULL DEFAULT true,
  restrictions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(plan_id, region_id)
);

-- 9. Create new plan_analytics table (usage metrics)
CREATE TABLE IF NOT EXISTS plan_analytics_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
  conversions INTEGER DEFAULT 0 CHECK (conversions >= 0),
  engagement_score NUMERIC(3,2) CHECK (engagement_score >= 0 AND engagement_score <= 1),
  
  UNIQUE(plan_id, date)
);

-- Phase 2: Create indexes for performance
-- =======================================

-- Core lookups
CREATE INDEX IF NOT EXISTS idx_plans_carrier_product ON plans(carrier_id, product_id);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plans_data_source ON plans(data_source);

-- Version queries
CREATE INDEX IF NOT EXISTS idx_plan_versions_current ON plan_versions(plan_id) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_plan_versions_price ON plan_versions(currency, premium_interval, premium_amount);
CREATE INDEX IF NOT EXISTS idx_plan_versions_effective ON plan_versions(effective_from, effective_to);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_plan_versions_name ON plan_versions USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_plan_versions_tags ON plan_versions USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_plan_versions_benefits ON plan_versions USING gin(benefits);

-- Regional queries
CREATE INDEX IF NOT EXISTS idx_plan_availability_region ON plan_availability(region_id, is_available);
CREATE INDEX IF NOT EXISTS idx_carriers_country ON carriers(country, is_active);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_plan_analytics_date ON plan_analytics_new(date, plan_id);

-- Phase 3: Seed basic data
-- =========================

-- Insert regions
INSERT INTO regions (country_code, country_name, country_name_es, country_name_en, currency) VALUES
('CO', 'Colombia', 'Colombia', 'Colombia', 'COP'),
('MX', 'Mexico', 'México', 'Mexico', 'MXN'),
('US', 'United States', 'Estados Unidos', 'United States', 'USD')
ON CONFLICT (country_code) DO NOTHING;

-- Insert basic product types
INSERT INTO products (name, name_es, name_en, type, slug, description, description_es, description_en) VALUES
('Auto Insurance', 'Seguro de Auto', 'Auto Insurance', 'auto', 'auto-insurance', 'Vehicle insurance coverage', 'Cobertura de seguro vehicular', 'Vehicle insurance coverage'),
('Health Insurance', 'Seguro de Salud', 'Health Insurance', 'health', 'health-insurance', 'Medical and health coverage', 'Cobertura médica y de salud', 'Medical and health coverage'),
('Life Insurance', 'Seguro de Vida', 'Life Insurance', 'life', 'life-insurance', 'Life insurance coverage', 'Cobertura de seguro de vida', 'Life insurance coverage'),
('Home Insurance', 'Seguro de Hogar', 'Home Insurance', 'home', 'home-insurance', 'Home and property coverage', 'Cobertura de hogar y propiedad', 'Home and property coverage'),
('Travel Insurance', 'Seguro de Viaje', 'Travel Insurance', 'travel', 'travel-insurance', 'Travel protection coverage', 'Cobertura de protección de viaje', 'Travel protection coverage'),
('Pet Insurance', 'Seguro de Mascotas', 'Pet Insurance', 'pet', 'pet-insurance', 'Pet health and accident coverage', 'Cobertura de salud y accidentes para mascotas', 'Pet health and accident coverage'),
('Business Insurance', 'Seguro Empresarial', 'Business Insurance', 'business', 'business-insurance', 'Business liability and property coverage', 'Cobertura de responsabilidad civil y propiedad empresarial', 'Business liability and property coverage'),
('Education Insurance', 'Seguro Educativo', 'Education Insurance', 'education', 'education-insurance', 'Education savings and protection', 'Ahorro educativo y protección', 'Education savings and protection')
ON CONFLICT (slug) DO NOTHING;

-- Insert major carriers from existing data
INSERT INTO carriers (name, name_es, name_en, slug, country, official_domain) VALUES
('AXA Colpatria', 'AXA Colpatria', 'AXA Colpatria', 'axa-colpatria', 'CO', 'axacolpatria.co'),
('Seguros SURA', 'Seguros SURA', 'SURA Insurance', 'seguros-sura', 'CO', 'segurossura.com.co'),
('Allianz', 'Allianz', 'Allianz', 'allianz', 'CO', 'allianz.com.co'),
('MAPFRE', 'MAPFRE', 'MAPFRE', 'mapfre', 'CO', 'mapfre.com.co'),
('Seguros Bolívar', 'Seguros Bolívar', 'Bolivar Insurance', 'seguros-bolivar', 'CO', 'segurosbolivar.com.co'),
('Seguros Falabella', 'Seguros Falabella', 'Falabella Insurance', 'seguros-falabella', 'CO', 'segurosfalabella.com.co'),
('Bancolombia', 'Bancolombia', 'Bancolombia', 'bancolombia', 'CO', 'bancolombia.com.co'),
('Global Seguros Colombia', 'Global Seguros Colombia', 'Global Insurance Colombia', 'global-seguros-colombia', 'CO', 'globalseguros.com.co'),
('Seguros del Estado', 'Seguros del Estado', 'State Insurance', 'seguros-del-estado', 'CO', 'segurosdelestado.gov.co'),
('AXA', 'AXA', 'AXA', 'axa', 'MX', 'axa.com.mx'),
('Chubb', 'Chubb', 'Chubb', 'chubb', 'MX', 'chubb.com.mx'),
('HDI Seguros', 'HDI Seguros', 'HDI Insurance', 'hdi-seguros', 'CO', 'hdi.com.co'),
('Colsanitas', 'Colsanitas', 'Colsanitas', 'colsanitas', 'CO', 'colsanitas.com'),
('Colmena Seguros', 'Colmena Seguros', 'Colmena Insurance', 'colmena-seguros', 'CO', 'colmenaseguros.com.co'),
('BMI Cos.', 'BMI Cos.', 'BMI Cos.', 'bmi-cos', 'CO', 'bmitravelassist.com')
ON CONFLICT (slug) DO NOTHING;

-- Phase 4: Data migration functions
-- ==================================

-- Function to migrate insurance_plans to new schema
CREATE OR REPLACE FUNCTION migrate_insurance_plans()
RETURNS INTEGER AS $$
DECLARE
  plan_record RECORD;
  new_plan_id UUID;
  new_version_id UUID;
  carrier_id UUID;
  product_id UUID;
  migrated_count INTEGER := 0;
BEGIN
  -- Loop through existing insurance plans
  FOR plan_record IN 
    SELECT * FROM insurance_plans 
    WHERE data_source IS NOT NULL 
    ORDER BY id
  LOOP
    -- Find or create carrier
    SELECT id INTO carrier_id 
    FROM carriers 
    WHERE LOWER(name) = LOWER(plan_record.provider) 
       OR LOWER(name_es) = LOWER(plan_record.provider)
       OR LOWER(name_en) = LOWER(plan_record.provider);
    
    IF carrier_id IS NULL THEN
      -- Create new carrier if not found
      INSERT INTO carriers (name, name_es, name_en, slug, country, official_domain)
      VALUES (
        plan_record.provider,
        plan_record.provider_es,
        plan_record.provider_en,
        LOWER(REPLACE(plan_record.provider, ' ', '-')),
        plan_record.country,
        plan_record.provider_official_domain
      ) RETURNING id INTO carrier_id;
    END IF;
    
    -- Find product by category
    SELECT id INTO product_id 
    FROM products 
    WHERE LOWER(type) = LOWER(plan_record.category);
    
    IF product_id IS NULL THEN
      -- Create product if category not found
      INSERT INTO products (name, name_es, name_en, type, slug, description)
      VALUES (
        plan_record.category,
        plan_record.category,
        plan_record.category,
        plan_record.category,
        LOWER(REPLACE(plan_record.category, ' ', '-')),
        'Auto-generated from legacy data'
      ) RETURNING id INTO product_id;
    END IF;
    
    -- Create new plan
    INSERT INTO plans (carrier_id, product_id, plan_code, is_active, data_source, external_id)
    VALUES (
      carrier_id,
      product_id,
      plan_record.id::text,
      true,
      COALESCE(plan_record.data_source, 'legacy'),
      plan_record.webhound_id
    ) RETURNING id INTO new_plan_id;
    
    -- Create plan version
    INSERT INTO plan_versions (
      plan_id, version, name, name_es, name_en, description, description_es, description_en,
      premium_amount, premium_interval, currency, coverage_amount, deductible,
      max_age, min_age, requires_medical, benefits, benefits_en, tags, features,
      effective_from, is_current
    ) VALUES (
      new_plan_id,
      1,
      plan_record.name,
      plan_record.plan_name_es,
      plan_record.plan_name_en,
      plan_record.description_en,
      plan_record.description_es,
      plan_record.description_en,
      plan_record.base_price,
      CASE 
        WHEN plan_record.monthly_premium IS NOT NULL THEN 'month'
        ELSE 'year'
      END,
      COALESCE(plan_record.currency, 'COP'),
      plan_record.coverage_amount,
      plan_record.deductible,
      plan_record.max_age,
      plan_record.min_age,
      plan_record.requires_medical,
      plan_record.benefits,
      plan_record.benefits_en,
      plan_record.tags,
      plan_record.features,
      CURRENT_DATE,
      true
    ) RETURNING id INTO new_version_id;
    
    -- Create marketing record
    INSERT INTO plan_marketing (
      plan_id, display_name, display_description, external_link, brochure_link,
      quote_link, target_demographic, price_range, partner_priority
    ) VALUES (
      new_plan_id,
      plan_record.name,
      plan_record.description_en,
      plan_record.external_link,
      plan_record.brochure_link,
      plan_record.quote_link,
      plan_record.target_demographic,
      plan_record.price_range,
      plan_record.partner_priority
    );
    
    -- Create availability record
    INSERT INTO plan_availability (plan_id, region_id, is_available)
    SELECT new_plan_id, id, true
    FROM regions
    WHERE country_code = plan_record.country;
    
    migrated_count := migrated_count + 1;
  END LOOP;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate plans_v2 to new schema
CREATE OR REPLACE FUNCTION migrate_plans_v2()
RETURNS INTEGER AS $$
DECLARE
  plan_record RECORD;
  new_plan_id UUID;
  new_version_id UUID;
  carrier_id UUID;
  product_id UUID;
  migrated_count INTEGER := 0;
BEGIN
  -- Loop through existing plans_v2
  FOR plan_record IN 
    SELECT * FROM plans_v2 
    ORDER BY id
  LOOP
    -- Find or create carrier
    SELECT id INTO carrier_id 
    FROM carriers 
    WHERE LOWER(name) = LOWER(plan_record.provider) 
       OR LOWER(name_es) = LOWER(plan_record.provider)
       OR LOWER(name_en) = LOWER(plan_record.provider);
    
    IF carrier_id IS NULL THEN
      -- Create new carrier if not found
      INSERT INTO carriers (name, name_es, name_en, slug, country, official_domain)
      VALUES (
        plan_record.provider,
        plan_record.provider,
        plan_record.provider,
        LOWER(REPLACE(plan_record.provider, ' ', '-')),
        plan_record.country,
        NULL
      ) RETURNING id INTO carrier_id;
    END IF;
    
    -- Find product by category
    SELECT id INTO product_id 
    FROM products 
    WHERE LOWER(type) = LOWER(plan_record.category);
    
    IF product_id IS NULL THEN
      -- Create product if category not found
      INSERT INTO products (name, name_es, name_en, type, slug, description)
      VALUES (
        plan_record.category,
        plan_record.category,
        plan_record.category,
        plan_record.category,
        LOWER(REPLACE(plan_record.category, ' ', '-')),
        'Auto-generated from plans_v2 data'
      ) RETURNING id INTO product_id;
    END IF;
    
    -- Create new plan
    INSERT INTO plans (carrier_id, product_id, plan_code, is_active, data_source, external_id)
    VALUES (
      carrier_id,
      product_id,
      plan_record.id,
      true,
      'plans_v2',
      plan_record.id
    ) RETURNING id INTO new_plan_id;
    
    -- Create plan version
    INSERT INTO plan_versions (
      plan_id, version, name, name_es, name_en, description,
      premium_amount, premium_interval, currency, benefits, benefits_en, tags,
      effective_from, is_current
    ) VALUES (
      new_plan_id,
      1,
      plan_record.name,
      plan_record.name,
      plan_record.name_en,
      NULL,
      plan_record.base_price,
      'month',
      plan_record.currency,
      plan_record.benefits,
      plan_record.benefits_en,
      plan_record.tags,
      CURRENT_DATE,
      true
    ) RETURNING id INTO new_version_id;
    
    -- Create marketing record
    INSERT INTO plan_marketing (
      plan_id, display_name, external_link, brochure_link
    ) VALUES (
      new_plan_id,
      plan_record.name,
      plan_record.external_link,
      plan_record.brochure_link
    );
    
    -- Create availability record
    INSERT INTO plan_availability (plan_id, region_id, is_available)
    SELECT new_plan_id, id, true
    FROM regions
    WHERE country_code = plan_record.country;
    
    migrated_count := migrated_count + 1;
  END LOOP;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Phase 5: Execute migration (commented out for safety)
-- =====================================================

-- Uncomment these lines to execute the migration:
-- SELECT migrate_insurance_plans();
-- SELECT migrate_plans_v2();

-- Phase 6: Verification queries
-- =============================

-- Check migration results
-- SELECT 'carriers' as table_name, COUNT(*) as count FROM carriers
-- UNION ALL
-- SELECT 'products', COUNT(*) FROM products
-- UNION ALL
-- SELECT 'plans', COUNT(*) FROM plans
-- UNION ALL
-- SELECT 'plan_versions', COUNT(*) FROM plan_versions
-- UNION ALL
-- SELECT 'plan_marketing', COUNT(*) FROM plan_marketing
-- UNION ALL
-- SELECT 'plan_availability', COUNT(*) FROM plan_availability;

-- Check data integrity
-- SELECT 
--   p.id,
--   c.name as carrier,
--   pr.name as product,
--   pv.name as plan_name,
--   pv.premium_amount,
--   pv.currency
-- FROM plans p
-- JOIN carriers c ON p.carrier_id = c.id
-- JOIN products pr ON p.product_id = pr.id
-- JOIN plan_versions pv ON p.id = pv.plan_id
-- WHERE pv.is_current = true
-- LIMIT 10;

-- Phase 7: Rollback functions (if needed)
-- ========================================

-- Function to rollback migration
CREATE OR REPLACE FUNCTION rollback_plans_migration()
RETURNS VOID AS $$
BEGIN
  -- Drop new tables in reverse dependency order
  DROP TABLE IF EXISTS plan_analytics_new CASCADE;
  DROP TABLE IF EXISTS plan_availability CASCADE;
  DROP TABLE IF EXISTS plan_marketing CASCADE;
  DROP TABLE IF EXISTS plan_localizations CASCADE;
  DROP TABLE IF EXISTS plan_versions CASCADE;
  DROP TABLE IF EXISTS plans CASCADE;
  DROP TABLE IF EXISTS products CASCADE;
  DROP TABLE IF EXISTS carriers CASCADE;
  DROP TABLE IF EXISTS regions CASCADE;
  
  -- Drop functions
  DROP FUNCTION IF EXISTS migrate_insurance_plans();
  DROP FUNCTION IF EXISTS migrate_plans_v2();
  DROP FUNCTION IF EXISTS rollback_plans_migration();
END;
$$ LANGUAGE plpgsql;

-- Uncomment to rollback:
-- SELECT rollback_plans_migration();
