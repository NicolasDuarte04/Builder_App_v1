import { Pool } from 'pg';
import { InsurancePlan, InsurancePlanFromDB } from '@/types/project';

// Check for database URL and initialize connection pool
export const hasDatabaseUrl = !!process.env.RENDER_POSTGRES_URL;

console.log('🔌 Database URL status:', hasDatabaseUrl ? 'Present' : 'Missing');
if (!hasDatabaseUrl) {
  console.warn('⚠️  RENDER_POSTGRES_URL environment variable is not set');
  console.warn('💡 If running in production, make sure to add RENDER_POSTGRES_URL to your deployment environment variables');
  console.warn('🔍 Current NODE_ENV:', process.env.NODE_ENV);
}

export const pool = hasDatabaseUrl
  ? new Pool({
      connectionString: process.env.RENDER_POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false,
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
  const formatCurrencyValue = (value: number, originalCurrency: string) => {
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
    external_link: plan.external_link,
    brochure_link: plan.brochure_link,
    created_at: new Date(plan.created_at).toISOString(),
    updated_at: new Date(plan.updated_at).toISOString(),
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
  try {
    if (!pool) {
      console.error('❌ No database connection available. Cannot query insurance plans.');
      console.error('💡 Make sure RENDER_POSTGRES_URL is set in your environment variables');
      // Return empty array instead of throwing to prevent frontend errors
      return [];
    }

    let query = 'SELECT * FROM insurance_plans WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.category) {
      // Normalize category to remove accents for better matching
      const normalizedCategory = filters.category
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove accents
      console.log(`🔍 Normalized category: ${filters.category} -> ${normalizedCategory}`);
      
      query += ` AND category ILIKE $${paramIndex++}`;
      params.push(`%${normalizedCategory}%`);
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
      query += ` AND tags @> $${paramIndex++}::text[]`;
      params.push(filters.tags);
    }
    if (filters.benefits_contain) {
      query += ` AND benefits::text ILIKE $${paramIndex++}`;
      params.push(`%${filters.benefits_contain}%`);
    }

    query += ' ORDER BY base_price ASC';
    query += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit || 4);

    const result = await pool.query(query, params);

    // If no exact matches found, try a fuzzy search
    if (result.rows.length === 0 && filters.category) {
      console.log(`📝 No exact matches for category '${filters.category}'. Trying fuzzy search...`);
      return await getFuzzyMatchPlans(filters);
    }

    return result.rows.map(transformPlan);
  } catch (error) {
    console.error('❌ Error querying insurance plans:', error);
    throw error; // Let the caller handle the error
  }
}

// Get fuzzy match plans when no exact matches are found
async function getFuzzyMatchPlans(filters: {
  category?: string;
  max_price?: number;
  country?: string;
  tags?: string[];
  benefits_contain?: string;
  limit?: number;
}): Promise<InsurancePlan[]> {
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