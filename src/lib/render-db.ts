import { Pool } from 'pg';

// Determine whether we have Postgres credentials (production) or should fallback to mock data (development/demo)
const hasDatabaseUrl = !!process.env.RENDER_POSTGRES_URL;

let pool: Pool | null = null;

if (hasDatabaseUrl) {
  pool = new Pool({
    connectionString: process.env.RENDER_POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.on('connect', () => {
    console.log('✅ Connected to Render PostgreSQL database');
  });

  pool.on('error', (err: Error) => {
    console.error('❌ Render PostgreSQL connection error:', err);
  });
} else {
  console.warn('⚠️  RENDER_POSTGRES_URL not set – using in-memory mock insurance plans');
}

// ---------------------------------------------------------------------------
// Mock data for local development (avoids runtime crashes when DB not present)
// ---------------------------------------------------------------------------

const mockPlans: InsurancePlan[] = [
  {
    id: '1',
    plan_name: 'Plan Salud Premium',
    provider: 'Seguros Bolívar',
    insurance_type: 'salud',
    monthly_premium: 150000,
    coverage_summary: 'Cobertura médica completa',
    quote_link: 'https://segurosbolivar.com',
    provider_logo: '',
    coverage_details: {},
    deductibles: {},
    exclusions: [],
    policy_duration: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    plan_name: 'Plan Salud Básico',
    provider: 'Sura',
    insurance_type: 'salud',
    monthly_premium: 80000,
    coverage_summary: 'Cobertura esencial',
    quote_link: 'https://sura.com',
    provider_logo: '',
    coverage_details: {},
    deductibles: {},
    exclusions: [],
    policy_duration: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// Insurance plan interface matching the database schema
export interface InsurancePlan {
  id: string;
  plan_name: string;
  provider: string;
  provider_logo?: string;
  insurance_type: string;
  monthly_premium: number;
  coverage_summary: string;
  coverage_details?: Record<string, any>;
  deductibles?: Record<string, number>;
  exclusions?: string[];
  policy_duration?: number;
  quote_link: string;
  created_at: string;
  updated_at: string;
}

// Query insurance plans with filters
export async function queryInsurancePlans(filters: {
  type?: string;
  maxPremium?: number;
  preferences?: string[];
  limit?: number;
}): Promise<InsurancePlan[]> {
  try {
    let query = 'SELECT * FROM insurance_plans WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Add insurance type filter
    if (filters.type) {
      query += ` AND insurance_type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    // Add budget filter
    if (filters.maxPremium) {
      query += ` AND monthly_premium <= $${paramIndex}`;
      params.push(filters.maxPremium);
      paramIndex++;
    }

    // Add preferences filter (search in coverage_summary)
    if (filters.preferences && filters.preferences.length > 0) {
      const preferenceConditions = filters.preferences.map((pref, index) => {
        query += ` AND coverage_summary ILIKE $${paramIndex + index}`;
        params.push(`%${pref}%`);
        return true;
      });
      paramIndex += filters.preferences.length;
    }

    // Order by premium (lowest first) and limit results
    query += ' ORDER BY monthly_premium ASC';
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit || 4);

    console.log('🔍 Querying insurance plans:', {
      query: query.substring(0, 100) + '...',
      params: params.slice(0, 3),
      filters
    });

    if (!hasDatabaseUrl || !pool) {
      // Return filtered mock data
      const filtered = mockPlans.filter(plan => {
        return (!filters.type || plan.insurance_type === filters.type) &&
               (!filters.maxPremium || plan.monthly_premium <= filters.maxPremium);
      }).slice(0, filters.limit || 4);
      console.log(`📝 Returning ${filtered.length} mock plans`);
      return filtered;
    }

    const result = await pool.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} insurance plans`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error querying insurance plans:', error);
    throw new Error(`Failed to query insurance plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get all available insurance types
export async function getInsuranceTypes(): Promise<string[]> {
  try {
    if (!hasDatabaseUrl || !pool) {
      return Array.from(new Set(mockPlans.map(p => p.insurance_type)));
    }

    const result = await pool.query('SELECT DISTINCT insurance_type FROM insurance_plans ORDER BY insurance_type');
    return result.rows.map((row: { insurance_type: string }) => row.insurance_type);
  } catch (error) {
    console.error('❌ Error getting insurance types:', error);
    throw new Error(`Failed to get insurance types: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get plan by ID
export async function getPlanById(planId: string): Promise<InsurancePlan | null> {
  try {
    if (!hasDatabaseUrl || !pool) {
      return mockPlans.find(p => p.id === planId) || null;
    }

    const result = await pool.query('SELECT * FROM insurance_plans WHERE id = $1', [planId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting plan by ID:', error);
    throw new Error(`Failed to get plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    if (!hasDatabaseUrl || !pool) return true;
    const result = await pool.query('SELECT 1');
    return result.rows.length > 0;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

export { pool }; 