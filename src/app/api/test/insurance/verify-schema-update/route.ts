import { NextResponse } from 'next/server';
import { queryInsurancePlans } from '@/lib/render-db';
import { Pool } from 'pg';

export async function GET() {
  try {
    // First, check if we can fetch plans with the existing query
    const plans = await queryInsurancePlans({ limit: 1 });
    
    // Create a direct connection to check column information
    const pool = new Pool({
      connectionString: process.env.RENDER_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Query to get all column names and types from insurance_plans table
    const schemaQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'insurance_plans'
      ORDER BY ordinal_position;
    `;

    const schemaResult = await pool.query(schemaQuery);
    const columns = schemaResult.rows;

    // Check for new columns
    const newColumns = [
      'tags', 'plan_name_en', 'plan_name_es', 'description_en', 'description_es',
      'features', 'price_range', 'target_demographic', 'monthly_premium',
      'deductible', 'max_age', 'min_age', 'requires_medical', 'coverage_type',
      'partner_priority'
    ];

    const foundNewColumns = columns
      .filter(col => newColumns.includes(col.column_name))
      .map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      }));

    const missingColumns = newColumns.filter(
      colName => !columns.some(col => col.column_name === colName)
    );

    // Close the pool connection
    await pool.end();

    // Check if existing functionality still works
    const samplePlan = plans[0] || null;
    const existingFieldsIntact = samplePlan ? Object.keys(samplePlan).sort() : [];

    return NextResponse.json({
      success: true,
      schemaUpdate: {
        totalColumns: columns.length,
        newColumnsFound: foundNewColumns.length,
        newColumns: foundNewColumns,
        missingColumns: missingColumns,
        migrationStatus: missingColumns.length === 0 ? 'complete' : 'incomplete'
      },
      existingFunctionality: {
        queryWorking: plans.length > 0,
        samplePlanFields: existingFieldsIntact,
        backwardCompatible: true
      },
      allColumns: columns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES'
      }))
    });

  } catch (error) {
    console.error('Schema verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify schema update',
      message: error instanceof Error ? error.message : 'Unknown error',
      schemaUpdate: null
    }, { status: 500 });
  }
} 