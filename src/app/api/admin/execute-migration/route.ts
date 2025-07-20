import { NextResponse } from 'next/server';
import { pool } from '@/lib/render-db';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Check for admin authorization (in production, use proper auth)
    const { authorization } = await request.json();
    if (authorization !== 'phase2-migration-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!pool) {
      return NextResponse.json({ 
        error: 'Database connection not available',
        message: 'RENDER_POSTGRES_URL environment variable not set'
      }, { status: 500 });
    }

    console.log('Starting Phase 2 Migration...');

    // Execute the ALTER TABLE statement
    const alterTableSQL = `
      ALTER TABLE insurance_plans
      ADD COLUMN IF NOT EXISTS tags TEXT[],
      ADD COLUMN IF NOT EXISTS plan_name_en VARCHAR,
      ADD COLUMN IF NOT EXISTS plan_name_es VARCHAR,
      ADD COLUMN IF NOT EXISTS description_en TEXT,
      ADD COLUMN IF NOT EXISTS description_es TEXT,
      ADD COLUMN IF NOT EXISTS features JSON,
      ADD COLUMN IF NOT EXISTS price_range VARCHAR,
      ADD COLUMN IF NOT EXISTS target_demographic TEXT[],
      ADD COLUMN IF NOT EXISTS monthly_premium NUMERIC,
      ADD COLUMN IF NOT EXISTS deductible NUMERIC,
      ADD COLUMN IF NOT EXISTS max_age INTEGER,
      ADD COLUMN IF NOT EXISTS min_age INTEGER,
      ADD COLUMN IF NOT EXISTS requires_medical BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS coverage_type VARCHAR,
      ADD COLUMN IF NOT EXISTS partner_priority INTEGER DEFAULT 0;
    `;

    await pool.query(alterTableSQL);

    // Add column comments
    const commentSQL = `
      COMMENT ON COLUMN insurance_plans.tags IS 'Array of tags for filtering (e.g., "más barato", "mejor cobertura")';
      COMMENT ON COLUMN insurance_plans.plan_name_en IS 'English plan name for internationalization';
      COMMENT ON COLUMN insurance_plans.plan_name_es IS 'Spanish plan name for internationalization';
      COMMENT ON COLUMN insurance_plans.description_en IS 'English description of the plan';
      COMMENT ON COLUMN insurance_plans.description_es IS 'Spanish description of the plan';
      COMMENT ON COLUMN insurance_plans.features IS 'JSON array of plan features';
      COMMENT ON COLUMN insurance_plans.price_range IS 'Price range description (e.g., "$50-$100/month")';
      COMMENT ON COLUMN insurance_plans.target_demographic IS 'Array of target demographics';
      COMMENT ON COLUMN insurance_plans.monthly_premium IS 'Monthly premium amount';
      COMMENT ON COLUMN insurance_plans.deductible IS 'Deductible amount';
      COMMENT ON COLUMN insurance_plans.max_age IS 'Maximum age for eligibility';
      COMMENT ON COLUMN insurance_plans.min_age IS 'Minimum age for eligibility';
      COMMENT ON COLUMN insurance_plans.requires_medical IS 'Whether medical exam is required';
      COMMENT ON COLUMN insurance_plans.coverage_type IS 'Type of coverage (salud, dental, auto, etc.)';
      COMMENT ON COLUMN insurance_plans.partner_priority IS 'Display priority for partner plans (higher = more prominent)';
    `;

    await pool.query(commentSQL);

    // Verify the migration
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'insurance_plans'
      AND column_name IN (
        'tags', 'plan_name_en', 'plan_name_es', 'description_en', 'description_es',
        'features', 'price_range', 'target_demographic', 'monthly_premium',
        'deductible', 'max_age', 'min_age', 'requires_medical', 'coverage_type',
        'partner_priority'
      )
      ORDER BY column_name;
    `;

    const result = await pool.query(verifyQuery);

    // Test backward compatibility
    const testQuery = 'SELECT id, name, provider, base_price FROM insurance_plans LIMIT 1';
    const testResult = await pool.query(testQuery);

    return NextResponse.json({
      success: true,
      message: 'Phase 2 migration completed successfully',
      newColumns: result.rows,
      newColumnsCount: result.rows.length,
      backwardCompatibilityTest: {
        passed: testResult.rows.length > 0,
        samplePlan: testResult.rows[0] || null
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
} 