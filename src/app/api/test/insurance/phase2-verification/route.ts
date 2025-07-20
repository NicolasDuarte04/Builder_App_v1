import { NextResponse } from 'next/server';
import { pool } from '@/lib/render-db';

export async function GET() {
  try {
    if (!pool) {
      return NextResponse.json({ 
        error: 'Database connection not available'
      }, { status: 500 });
    }

    // Test 1: Check all columns in the table
    const allColumnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'insurance_plans'
      ORDER BY ordinal_position;
    `;
    const allColumnsResult = await pool.query(allColumnsQuery);

    // Test 2: Verify new columns exist
    const newColumns = [
      'tags', 'plan_name_en', 'plan_name_es', 'description_en', 'description_es',
      'features', 'price_range', 'target_demographic', 'monthly_premium',
      'deductible', 'max_age', 'min_age', 'requires_medical', 'coverage_type',
      'partner_priority'
    ];

    const existingColumns = allColumnsResult.rows.map(row => row.column_name);
    const addedColumns = newColumns.filter(col => existingColumns.includes(col));
    const missingColumns = newColumns.filter(col => !existingColumns.includes(col));

    // Test 3: Sample query with new fields
    const sampleQuery = `
      SELECT 
        id, name, provider, base_price, category,
        tags, plan_name_en, plan_name_es, description_en, description_es,
        features, price_range, target_demographic, monthly_premium,
        deductible, max_age, min_age, requires_medical, coverage_type,
        partner_priority
      FROM insurance_plans
      LIMIT 1;
    `;
    
    let sampleWithNewFields = null;
    try {
      const sampleResult = await pool.query(sampleQuery);
      sampleWithNewFields = sampleResult.rows[0] || null;
    } catch (error) {
      console.error('Sample query error:', error);
    }

    // Test 4: Backward compatibility test
    const backwardQuery = 'SELECT id, name, provider, base_price FROM insurance_plans LIMIT 1';
    const backwardResult = await pool.query(backwardQuery);

    return NextResponse.json({
      success: true,
      phase2Status: {
        migrationComplete: missingColumns.length === 0,
        totalColumns: allColumnsResult.rows.length,
        newColumnsAdded: addedColumns.length,
        addedColumns: addedColumns,
        missingColumns: missingColumns
      },
      tests: {
        newFieldsAccessible: sampleWithNewFields !== null,
        backwardCompatible: backwardResult.rows.length > 0,
        sampleWithNewFields: sampleWithNewFields
      },
      columnDetails: allColumnsResult.rows.filter(col => 
        newColumns.includes(col.column_name)
      ).map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      }))
    });

  } catch (error) {
    console.error('Phase 2 verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify Phase 2 migration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 