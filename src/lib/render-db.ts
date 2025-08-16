import { Pool } from 'pg';
import { InsurancePlan, InsurancePlanFromDB } from '@/types/project';

// Category normalization map
const CATEGORY_MAP: Record<string, string> = {
  salud: 'salud',
  dental: 'dental',
  vida: 'vida',
  viaje: 'viaje',
  hogar: 'hogar',
  auto: 'auto',
  mascotas: 'mascotas',
  otros: 'otros',
};

export function normalizeCategory(input?: string) {
  if (!input) return undefined;
  const k = input.trim().toLowerCase();
  return CATEGORY_MAP[k] ?? k;
}

// Unified database URL resolution
const DB_URL_CANDIDATE = process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL || '';

// Ensure sslmode=require is present
let DB_URL = DB_URL_CANDIDATE;
if (DB_URL_CANDIDATE && !/sslmode=require/.test(DB_URL_CANDIDATE)) {
  DB_URL = `${DB_URL_CANDIDATE}${DB_URL_CANDIDATE.includes('?') ? '&' : '?'}sslmode=require`;
}

export const hasDatabaseUrl = !!DB_URL;
const envVarSet = !!(process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL);

// Debug logging
const debugInfo = {
  hasDatabaseUrl,
  envVarSet,
  envVarLength: DB_URL.length,
};

console.log('🔌 Database connection details:', debugInfo);

if (!hasDatabaseUrl) {
  console.warn('⚠️  DATABASE_URL or RENDER_POSTGRES_URL environment variable is not set.');
  console.warn('💡 If running in production, make sure to add the connection string to your deployment environment variables.');
  console.warn('💡 If running locally, ensure it is set in your .env.local file.');
  console.warn('🔍 Current NODE_ENV:', process.env.NODE_ENV);
}

export const pool = hasDatabaseUrl
  ? new Pool({
      connectionString: DB_URL,
      ssl: {
        rejectUnauthorized: false, // Required for some cloud providers
      },
    })
  : null;

if (pool) {
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit the process, just log the error
  });
}

function transformPlan(plan: InsurancePlanFromDB): InsurancePlan {
  // Format currency values - always display in COP for Colombian market
  const formatCurrencyValue = (value: number | null, originalCurrency: string) => {
    if (value === null || value === undefined) return null;
    
    // Convert to COP if needed (rough conversion rates)
    let copValue = value;
    if (originalCurrency === 'USD') {
      copValue = value * 4000; // Approximate USD to COP
    } else if (originalCurrency === 'EUR') {
      copValue = value * 4400; // Approximate EUR to COP
    }
    
    const formatter = new Intl.NumberFormat('es-CO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${formatter.format(copValue)} COP`;
  };

  // Parse JSON fields safely
  const parseJsonField = (field: any) => {
    if (!field) return null;
    if (typeof field === 'object') return field;
    try {
      return JSON.parse(field);
    } catch {
      return null;
    }
  };

  return {
    id: plan.id.toString(),
    name: plan.name,
    provider: plan.provider,
    base_price: parseFloat(plan.base_price as any),
    base_price_formatted: formatCurrencyValue(parseFloat(plan.base_price as any), plan.currency),
    benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
    category: plan.category,
    country: plan.country,
    coverage_amount: parseFloat(plan.coverage_amount as any),
    coverage_amount_formatted: formatCurrencyValue(parseFloat(plan.coverage_amount as any), plan.currency),
    currency: 'COP', // Always return COP for frontend consistency
    rating: plan.rating,
    reviews: plan.reviews,
    is_external: plan.is_external,
    external_link: plan.external_link ?? null,
    link_status: (plan as any).link_status ?? null,
    final_url: (plan as any).final_url ?? null,
    last_verified_at: (plan as any).last_verified_at ?? null,
    provider_official_domain: (plan as any).provider_official_domain ?? null,
    brochure_link: plan.brochure_link ?? null,
    created_at: new Date(plan.created_at).toISOString(),
    updated_at: new Date(plan.updated_at).toISOString(),
    
    // Extended fields for richer comparison
    plan_name_es: plan.plan_name_es || plan.name,
    plan_name_en: plan.plan_name_en,
    provider_es: plan.provider_es || plan.provider,
    provider_en: plan.provider_en,
    monthly_premium: plan.monthly_premium ? parseFloat(plan.monthly_premium as any) : null,
    monthly_premium_formatted: plan.monthly_premium ? formatCurrencyValue(parseFloat(plan.monthly_premium as any), plan.currency) : null,
    deductible: plan.deductible ? parseFloat(plan.deductible as any) : null,
    deductible_formatted: plan.deductible ? formatCurrencyValue(parseFloat(plan.deductible as any), plan.currency) : null,
    min_age: plan.min_age,
    max_age: plan.max_age,
    requires_medical: plan.requires_medical,
    features: parseJsonField(plan.features),
    tags: Array.isArray(plan.tags) ? plan.tags : [],
    benefits_en: Array.isArray(plan.benefits_en) ? plan.benefits_en : [],
    subcategory: plan.subcategory,
    price_range: plan.price_range,
    target_demographic: Array.isArray(plan.target_demographic) ? plan.target_demographic : [],
    coverage_type: plan.coverage_type,
    quote_link: plan.quote_link,
    data_source: plan.data_source,
    last_synced_at: plan.last_synced_at ? new Date(plan.last_synced_at).toISOString() : null,
  };
}

// Query insurance plans with filters
export async function queryInsurancePlans(filters: {
  category?: string;
  max_price?: number;
  country?: string;
  tags?: string[];
  benefits_contain?: string;
  limit?: number;
}): Promise<InsurancePlan[]> {
  if (!pool) {
    console.error('❌ No database connection available. Cannot query insurance plans.');
    console.error('💡 Make sure RENDER_POSTGRES_URL is set in your environment variables');
    return [];
  }

  const buildQuery = (isCompat = false) => {
    const selectClause = isCompat
      ? `SELECT *,
         'valid' as link_status,
         external_link as final_url,
         NOW() as last_verified_at`
      : 'SELECT *';

    let query = `${selectClause} FROM insurance_plans WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (!isCompat) {
      query += ` AND link_status IN ('valid', 'redirected')`;
    }

    if (filters.category) {
      // Support multiple categories provided as a comma-separated list
      const raw = String(filters.category);
      const parts = raw.split(',').map((s) => normalizeCategory(s)).filter(Boolean) as string[];
      if (parts.length > 1) {
        query += ` AND category = ANY($${paramIndex++}::text[])`;
        params.push(parts);
      } else {
        const normalizedCategory = normalizeCategory(parts[0] || raw);
        console.log(`🔍 Normalized category: ${filters.category} -> ${normalizedCategory}`);
        query += ` AND category = $${paramIndex++}`;
        params.push(normalizedCategory);
      }
    }
    if (filters.country) {
      query += ` AND country = $${paramIndex++}`;
      params.push(filters.country);
    }
    if (filters.max_price) {
      query += ` AND base_price <= $${paramIndex++}`;
      params.push(filters.max_price);
    }
    if (filters.tags && filters.tags.length > 0) {
      // Legacy compat: tags is text[] → use array overlap (&&) with text[] cast
      query += ` AND (tags && $${paramIndex++}::text[])`;
      params.push(filters.tags);
    }
    if (filters.benefits_contain) {
      // Legacy compat: benefits is text[] → search any element via unnest + ILIKE
      query += ` AND EXISTS (SELECT 1 FROM unnest(benefits) AS b WHERE b ILIKE $${paramIndex++})`;
      params.push(`%${filters.benefits_contain}%`);
    }

    query += ' ORDER BY base_price ASC';
    query += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit || 4);

    return { query, params };
  };

  try {
    const { query, params } = buildQuery();
    const result = await pool.query(query, params);
    console.log(`[db] used rich query; rows: ${result.rows.length}`);

    if (result.rows.length === 0 && filters.category) {
      console.log(`📝 No exact matches for category '${filters.category}'. Trying fuzzy search...`);
      return await getFuzzyMatchPlans(filters);
    }
    return result.rows.map(transformPlan);
  } catch (error: any) {
    if (error.message.includes('column "link_status" does not exist')) {
      console.warn('⚠️ Fallback to compatibility query due to missing "link_status" column.');
      const { query, params } = buildQuery(true);
      console.log('[db] compat query built', {
        category: filters.category,
        hasTags: !!filters.tags?.length,
        hasBenefits: !!filters.benefits_contain?.length,
      });
      const result = await pool.query(query, params);
      console.log(`[db] used compat query; rows: ${result.rows.length}`);

      if (result.rows.length === 0 && filters.category) {
        return await getFuzzyMatchPlans(filters, true);
      }
      return result.rows.map(transformPlan);
    }
    console.error('❌ Error querying insurance plans:', error);
    throw error;
  }
}

// Get fuzzy match plans when no exact matches are found
async function getFuzzyMatchPlans(
  filters: {
    category?: string;
    max_price?: number;
    country?: string;
    tags?: string[];
    benefits_contain?: string;
    limit?: number;
  },
  isCompat = false
): Promise<InsurancePlan[]> {
  try {
    if (!pool) {
      console.error('❌ No database connection available.');
      return [];
    }

    console.log(`🔍 Attempting fuzzy search for category: ${filters.category}`);

    // First, check if this is a typo or variant of the category
    if (filters.category) {
      // Normalize category to remove accents
      const normalizedCategory = filters.category
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      // Try searching with partial match on category
      let query = 'SELECT * FROM insurance_plans WHERE category ILIKE $1';
      const params: any[] = [`%${normalizedCategory}%`];
      let paramIndex = 2;

      // Add other filters
      if (filters.country) {
        query += ` AND country = $${paramIndex++}`;
        params.push(filters.country);
      }
      if (filters.max_price) {
        query += ` AND base_price <= $${paramIndex++}`;
        params.push(filters.max_price);
      }

      query += ' ORDER BY base_price ASC';
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit || 4);

      console.log('🔍 Trying partial category match...');
      const partialResult = await pool.query(query, params);
      
      if (partialResult.rows.length > 0) {
        console.log(`✅ Found ${partialResult.rows.length} plans with partial category match`);
        return partialResult.rows.map(transformPlan);
      }
    }

    // If no partial match, fall back to showing any plans within constraints
    // but this should be marked as a true fallback
    console.log('🔍 No category match found. Showing general fallback plans...');
    
    let query = 'SELECT * FROM insurance_plans WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Keep country filter if specified
    if (filters.country) {
      query += ` AND country = $${paramIndex++}`;
      params.push(filters.country);
    }

    // Keep price filter if specified
    if (filters.max_price) {
      query += ` AND base_price <= $${paramIndex++}`;
      params.push(filters.max_price);
    }

    // Order by price to show most affordable options
    query += ' ORDER BY base_price ASC';
    query += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit || 4);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      // If still no results, remove all filters except country
      console.log('🔍 No results with price filter. Trying without price limit...');
      let fallbackQuery = 'SELECT * FROM insurance_plans WHERE 1=1';
      const fallbackParams: any[] = [];
      let fallbackIndex = 1;

      if (filters.country) {
        fallbackQuery += ` AND country = $${fallbackIndex++}`;
        fallbackParams.push(filters.country);
      }

      fallbackQuery += ' ORDER BY base_price ASC';
      fallbackQuery += ` LIMIT $${fallbackIndex++}`;
      fallbackParams.push(filters.limit || 4);

      const fallbackResult = await pool.query(fallbackQuery, fallbackParams);
      return fallbackResult.rows.map(transformPlan);
    }

    return result.rows.map(transformPlan);
  } catch (error) {
    console.error('❌ Error in fuzzy search:', error);
    return [];
  }
}



// Get all available insurance types
export async function getInsuranceTypes(): Promise<string[]> {
  if (!pool) {
    console.error('❌ Database connection not available.');
    return [];
  }
  try {
    const result = await pool.query('SELECT DISTINCT category FROM insurance_plans ORDER BY category');
    return result.rows.map((row: { category: string }) => row.category);
  } catch (error) {
    console.error('❌ Error getting insurance types:', error);
    return [];
  }
}

// Get plan by ID
export async function getPlanById(planId: string): Promise<InsurancePlan | null> {
  if (!pool) {
    console.error('❌ Database connection not available.');
    return null;
  }
  try {
    const result = await pool.query('SELECT * FROM insurance_plans WHERE id = $1', [planId]);
    if (result.rows.length === 0) {
      return null;
    }
    return transformPlan(result.rows[0]);
  } catch (error) {
    console.error('❌ Error getting plan by ID:', error);
    return null;
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Manual test function to verify database data
export async function testDatabaseData(): Promise<void> {
  try {
    if (!pool) {
      console.log('📝 No database connection - using mock data');
      return;
    }

    // Test basic connection
    const connectionTest = await pool.query('SELECT 1 as test');

    // Test table existence
    const tableTest = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'insurance_plans'
      );
    `);

    // Test data count
    const countTest = await pool.query('SELECT COUNT(*) as total FROM insurance_plans');

    // Test sample data
    const sampleTest = await pool.query('SELECT * FROM insurance_plans LIMIT 3');

    // Test filtered query (like the tool would use)
    const filteredTest = await pool.query(`
      SELECT * FROM insurance_plans 
      WHERE category = 'salud' 
      ORDER BY monthly_premium ASC 
      LIMIT 4
    `);

  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 