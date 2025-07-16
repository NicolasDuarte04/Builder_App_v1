import { NextResponse } from 'next/server';
import { testDatabaseData, pool, hasDatabaseUrl } from '@/lib/render-db';

export async function GET() {
  try {
    console.log('🧪 Test DB endpoint called');
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: {
        hasDatabaseUrl,
        renderPostgresUrl: process.env.RENDER_POSTGRES_URL ? 'SET' : 'NOT SET',
        urlPreview: process.env.RENDER_POSTGRES_URL ? process.env.RENDER_POSTGRES_URL.substring(0, 20) + '...' : 'N/A'
      },
      connection: {
        poolExists: !!pool,
        willUseMock: !hasDatabaseUrl || !pool
      },
      database: {
        connected: false,
        tableExists: false,
        totalPlans: 0,
        samplePlans: [] as any[],
        error: null as string | null,
        filteredPlans: null as any
      }
    };

    // Test database connection and data
    try {
      if (!hasDatabaseUrl || !pool) {
        results.database.error = 'No database connection available - using mock data';
        return NextResponse.json(results);
      }

      // Test basic connection
      const connectionTest = await pool.query('SELECT 1 as test');
      results.database.connected = connectionTest.rows.length > 0;

      if (!results.database.connected) {
        results.database.error = 'Basic connection test failed';
        return NextResponse.json(results);
      }

      // Test table existence
      const tableTest = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'insurance_plans'
        );
      `);
      results.database.tableExists = tableTest.rows[0]?.exists || false;

      if (!results.database.tableExists) {
        results.database.error = 'insurance_plans table does not exist';
        return NextResponse.json(results);
      }

      // Test data count
      const countTest = await pool.query('SELECT COUNT(*) as total FROM insurance_plans');
      results.database.totalPlans = parseInt(countTest.rows[0]?.total || '0');

      // Test sample data
      const sampleTest = await pool.query('SELECT * FROM insurance_plans LIMIT 3');
      results.database.samplePlans = sampleTest.rows;

      // Test filtered query (like the tool would use)
      const filteredTest = await pool.query(`
        SELECT * FROM insurance_plans 
        WHERE category = 'salud' 
        ORDER BY base_price ASC 
        LIMIT 4
      `);

      results.database.filteredPlans = {
        type: 'salud',
        count: filteredTest.rows.length,
        plans: filteredTest.rows
      };

    } catch (dbError) {
      results.database.error = dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.error('❌ Database test failed:', dbError);
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Test DB endpoint error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 