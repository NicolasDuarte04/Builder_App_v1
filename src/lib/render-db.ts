import { Pool } from 'pg';
import { InsurancePlan, InsurancePlanFromDB } from '@/types/project';

// Check for database URL and initialize connection pool
export const hasDatabaseUrl = !!process.env.RENDER_POSTGRES_URL;

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
    process.exit(-1);
  });
}

console.log('Database connection status:', {
  hasDatabaseUrl,
  poolExists: !!pool,
});

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
  limit?: number;
}): Promise<InsurancePlan[]> {
  console.log('🔍 queryInsurancePlans called with filters:', filters);

  if (!pool) {
    console.error('❌ Database connection not available.');
    return [];
  }

  try {
    let query = 'SELECT * FROM insurance_plans WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.category) {
      query += ` AND category ILIKE $${paramIndex++}`;
      params.push(`%${filters.category}%`);
    }
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

    console.log('🔍 Executing final query:', { query, params });

    const result = await pool.query(query, params);

    console.log(`✅ Database query successful: Found ${result.rows.length} plans.`);
    return result.rows.map(transformPlan);
  } catch (error) {
    console.error('❌ Error querying insurance plans:', error);
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
  console.log('🧪 Testing database data availability...');
  
  if (!pool) {
    console.log('📝 No database connection - using mock data');
    return;
  }

  try {
    // Test basic connection
    console.log('🔍 Testing basic connection...');
    const connectionTest = await pool.query('SELECT 1 as test');
    console.log('✅ Basic connection successful:', connectionTest.rows[0]);

    // Test table existence
    console.log('🔍 Testing table existence...');
    const tableTest = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'insurance_plans'
      );
    `);
    console.log('✅ Table existence check:', tableTest.rows[0]);

    // Test data count
    console.log('🔍 Testing data count...');
    const countTest = await pool.query('SELECT COUNT(*) as total FROM insurance_plans');
    console.log('✅ Total plans in database:', countTest.rows[0].total);

    // Test sample data
    console.log('🔍 Testing sample data...');
    const sampleTest = await pool.query('SELECT * FROM insurance_plans LIMIT 3');
    console.log('✅ Sample plans:', sampleTest.rows);

    // Test filtered query (like the tool would use)
    console.log('🔍 Testing filtered query (salud type)...');
    const filteredTest = await pool.query(`
      SELECT * FROM insurance_plans 
      WHERE category = 'salud' 
      ORDER BY monthly_premium ASC 
      LIMIT 4
    `);
    console.log('✅ Filtered plans (salud):', {
      count: filteredTest.rows.length,
      plans: filteredTest.rows
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 