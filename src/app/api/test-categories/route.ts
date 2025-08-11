import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = process.env.RENDER_POSTGRES_URL
  ? new Pool({
      connectionString: process.env.RENDER_POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export async function GET() {
  try {
    if (!pool) {
      return NextResponse.json({ error: 'No database connection' }, { status: 500 });
    }

    // Get category counts
    const categoriesResult = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM insurance_plans 
      WHERE category IS NOT NULL
      GROUP BY category 
      ORDER BY count DESC
    `);

    // Get total count
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM insurance_plans');

    // Get sample plans from each category
    const samplesResult = await pool.query(`
      SELECT DISTINCT ON (category) 
        category, plan_name_es, provider_es, base_price
      FROM insurance_plans 
      WHERE category IS NOT NULL
      ORDER BY category, created_at DESC
    `);

    const response = {
      timestamp: new Date().toISOString(),
      database: 'Render PostgreSQL (briki_db)',
      total_plans: totalResult.rows[0].total,
      categories_with_counts: categoriesResult.rows,
      distinct_categories: categoriesResult.rows.map(r => r.category),
      sample_plans: samplesResult.rows
    };

    console.log('📊 Database Category Report:');
    console.log('================================');
    console.log(`Total Plans: ${response.total_plans}`);
    console.log('\nCategories with counts:');
    categoriesResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} plans`);
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('❌ Error testing categories:', error);
    return NextResponse.json({
      error: 'Database query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
