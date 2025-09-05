# BrikiDB Plans Audit & Data Model Proposal

## Executive Summary

This audit examines the current "plans" ecosystem in BrikiDB (Render Postgres) and proposes a scalable, pricing-ready data model. The current system has **117 insurance plans** in the legacy table and **71 plans** in the newer `plans_v2` table, with significant schema duplication and data quality issues.

## Current Schema Analysis

### Plan-Related Tables

| Table | Rows | Purpose | Status |
|-------|------|---------|---------|
| `insurance_plans` | 117 | Legacy insurance plans | Active, heavily used |
| `plans_v2` | 71 | Newer, cleaner schema | Active, growing |
| `company_plans` | 0 | Company-specific plans | Empty, unused |
| `quotes` | 0 | User quote requests | Empty, unused |
| `plan_analytics` | 0 | Plan performance metrics | Empty, unused |
| `insurance_plans_backup` | - | Backup of legacy data | Backup only |
| `insurance_plans_old` | - | Previous version | Deprecated |

### Schema Evolution Issues

1. **Dual Schema Problem**: Two active tables (`insurance_plans` and `plans_v2`) with overlapping data
2. **Schema Drift**: Legacy table has 60+ columns vs. plans_v2 with 16 clean columns
3. **Data Inconsistency**: Different naming conventions, data types, and constraints
4. **Migration Complexity**: Ongoing migration from legacy to v2 schema

## Current Data Quality Issues

### Critical Field Analysis

| Field | Null Count | Issues |
|-------|------------|---------|
| `name` | 0 | ✅ Required, no nulls |
| `provider` | 0 | ✅ Required, no nulls |
| `base_price` | 0 | ✅ Required, no nulls |
| `category` | 0 | ✅ Required, no nulls |
| `country` | 0 | ✅ Required, no nulls |
| `currency` | 0 | ✅ Required, no nulls |

### Data Quality Problems

1. **Price Inconsistency**: Many plans show `base_price = 0` (placeholder pricing)
2. **Currency Mix**: Mixed currencies (COP, MXN, EUR, USD) without conversion logic
3. **Provider Variations**: Same company with different names (e.g., "AXA" vs "AXA Colpatria")
4. **Category Inconsistency**: Some plans have multiple categories or unclear categorization
5. **Missing Localization**: Inconsistent Spanish/English naming and descriptions

### Duplication Analysis

- **No exact duplicates** found by normalized name + provider
- **Potential semantic duplicates** exist across different data sources
- **Provider name variations** create confusion (e.g., "Seguros SURA" vs "SURA")

## Current App Usage Patterns

### API Endpoints

1. **`/api/plans_v2/search`** - Primary search endpoint for plans_v2
2. **`/api/insurance/plans`** - Legacy endpoint for insurance_plans
3. **`/api/plans_v2/diag`** - Diagnostic endpoint for plans_v2

### Query Patterns

- **Category-based filtering** (most common)
- **Country-based filtering** (CO, MX)
- **Price range filtering**
- **Tag-based filtering** (JSONB GIN index)
- **Text search** across name, provider, description

### Frontend Components

- **PlanResultsSidebar** - Main plan display component
- **PlanDetailsModal** - Plan detail view
- **PlanResultsObserver** - Event-driven plan updates

## Recommended Data Model

### 1. Core Tables

#### `carriers` (Insurance Companies)
```sql
CREATE TABLE carriers (
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
```

#### `products` (Insurance Product Types)
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_es TEXT,
  name_en TEXT,
  type TEXT NOT NULL, -- 'auto','home','health','life','business','travel','pet'
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  description_es TEXT,
  description_en TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `plans` (Canonical Plan Records)
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  plan_code TEXT, -- Vendor-specific plan code
  is_active BOOLEAN NOT NULL DEFAULT true,
  data_source TEXT NOT NULL DEFAULT 'manual', -- 'manual','webhound','api'
  external_id TEXT, -- ID from external system
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(carrier_id, product_id, plan_code)
);
```

### 2. Versioned Attributes

#### `plan_versions` (Price & Coverage Changes)
```sql
CREATE TABLE plan_versions (
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
  premium_amount NUMERIC(12,2),
  premium_interval TEXT CHECK (premium_interval IN ('month','year','one_time')),
  currency TEXT NOT NULL DEFAULT 'COP',
  
  -- Coverage
  coverage_amount NUMERIC(12,2),
  deductible NUMERIC(12,2),
  max_age INTEGER,
  min_age INTEGER,
  requires_medical BOOLEAN DEFAULT false,
  
  -- Features
  benefits JSONB DEFAULT '[]',
  benefits_en JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  features JSONB DEFAULT '{}',
  
  -- Validity
  effective_from DATE,
  effective_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(plan_id, version)
);
```

### 3. Localization & Marketing

#### `plan_localizations` (Language-Specific Content)
```sql
CREATE TABLE plan_localizations (
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
```

#### `plan_marketing` (Promotional & Display)
```sql
CREATE TABLE plan_marketing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  -- Display
  display_name TEXT,
  display_description TEXT,
  badge TEXT, -- 'popular','best_value','new'
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
```

### 4. Regional & Availability

#### `regions` (Geographic Coverage)
```sql
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE, -- 'CO','MX','US'
  country_name TEXT NOT NULL,
  country_name_es TEXT,
  country_name_en TEXT,
  currency TEXT NOT NULL DEFAULT 'COP',
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

#### `plan_availability` (Regional Availability)
```sql
CREATE TABLE plan_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id),
  is_available BOOLEAN NOT NULL DEFAULT true,
  restrictions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(plan_id, region_id)
);
```

### 5. Analytics & Performance

#### `plan_analytics` (Usage Metrics)
```sql
CREATE TABLE plan_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  engagement_score NUMERIC(3,2),
  
  UNIQUE(plan_id, date)
);
```

## Migration Strategy

### Phase 1: Create New Schema
1. Create new tables with proper constraints
2. Seed with basic data (carriers, products, regions)
3. Create indexes for performance

### Phase 2: Data Migration
1. Map existing data to new schema
2. Handle data quality issues
3. Preserve external IDs for traceability

### Phase 3: App Updates
1. Update API endpoints to use new schema
2. Modify frontend components
3. Add data validation and error handling

### Phase 4: Cleanup
1. Remove legacy tables
2. Update documentation
3. Monitor performance

## Indexing Strategy

### Performance Indexes
```sql
-- Core lookups
CREATE INDEX idx_plans_carrier_product ON plans(carrier_id, product_id);
CREATE INDEX idx_plans_active ON plans(is_active) WHERE is_active = true;

-- Version queries
CREATE INDEX idx_plan_versions_current ON plan_versions(plan_id) WHERE is_current = true;
CREATE INDEX idx_plan_versions_price ON plan_versions(currency, premium_interval, premium_amount);

-- Search indexes
CREATE INDEX idx_plan_versions_name ON plan_versions USING gin(to_tsvector('spanish', name));
CREATE INDEX idx_plan_versions_tags ON plan_versions USING gin(tags);

-- Regional queries
CREATE INDEX idx_plan_availability_region ON plan_availability(region_id, is_available);

-- Analytics
CREATE INDEX idx_plan_analytics_date ON plan_analytics(date, plan_id);
```

## Data Quality Improvements

### 1. Standardization
- **Provider Names**: Canonical provider names with aliases
- **Categories**: Standardized product categories
- **Currencies**: Primary currency per region with conversion rates
- **Pricing**: Consistent pricing structure (monthly/yearly)

### 2. Validation Rules
- **Required Fields**: name, carrier, product, pricing, region
- **Data Types**: Proper numeric types for prices, dates for validity
- **Constraints**: Check constraints for valid values
- **Foreign Keys**: Proper referential integrity

### 3. Deduplication Strategy
- **Natural Keys**: (carrier, product, plan_code) combination
- **Fuzzy Matching**: Similar names within same carrier
- **Data Source Priority**: Manual > API > WebHound

## Sample Seed Data

### Carriers
```json
[
  {
    "name": "AXA Colpatria",
    "name_es": "AXA Colpatria",
    "name_en": "AXA Colpatria",
    "slug": "axa-colpatria",
    "country": "CO",
    "official_domain": "axacolpatria.co"
  },
  {
    "name": "Seguros SURA",
    "name_es": "Seguros SURA",
    "name_en": "SURA Insurance",
    "slug": "seguros-sura",
    "country": "CO",
    "official_domain": "segurossura.com.co"
  }
]
```

### Products
```json
[
  {
    "name": "Auto Insurance",
    "name_es": "Seguro de Auto",
    "name_en": "Auto Insurance",
    "type": "auto",
    "slug": "auto-insurance"
  },
  {
    "name": "Health Insurance",
    "name_es": "Seguro de Salud",
    "name_en": "Health Insurance",
    "type": "health",
    "slug": "health-insurance"
  }
]
```

## Benefits of New Model

### 1. Scalability
- **Normalized Structure**: Eliminates data duplication
- **Versioning**: Safe price/coverage updates
- **Extensibility**: Easy to add new fields/features

### 2. Data Quality
- **Constraints**: Database-level validation
- **Consistency**: Standardized naming and structure
- **Traceability**: Audit trail for changes

### 3. Performance
- **Optimized Indexes**: Fast queries for common patterns
- **Partitioning**: Can partition by region/date
- **Caching**: Better cache hit rates

### 4. Business Value
- **Pricing Ready**: Structured for dynamic pricing
- **Localization**: Multi-language support
- **Analytics**: Built-in performance tracking
- **Marketing**: Flexible promotional features

## Implementation Timeline

### Week 1-2: Schema Design & Validation
- Finalize table structures
- Create migration scripts
- Set up development environment

### Week 3-4: Data Migration
- Create new tables
- Migrate existing data
- Validate data integrity

### Week 5-6: API Updates
- Update backend endpoints
- Modify frontend components
- Add error handling

### Week 7-8: Testing & Deployment
- Comprehensive testing
- Performance validation
- Production deployment

### Week 9-10: Cleanup & Monitoring
- Remove legacy tables
- Monitor performance
- Update documentation

## Conclusion

The current BrikiDB plans system has grown organically with multiple schemas and data quality issues. The proposed normalized model provides a solid foundation for scaling the insurance plan catalog while maintaining data integrity and performance. The migration can be done incrementally, minimizing disruption to the existing application.

Key recommendations:
1. **Implement the new normalized schema** with proper constraints
2. **Migrate data incrementally** to minimize risk
3. **Standardize provider and product naming** for consistency
4. **Add comprehensive indexing** for search performance
5. **Implement data validation** at the database level
6. **Plan for future features** like dynamic pricing and advanced analytics

This model positions Briki for growth while maintaining the flexibility needed for the insurance industry's evolving requirements.
