import { NextResponse } from 'next/server';
import { pool } from '@/lib/render-db';

export async function GET() {
  try {
    if (!pool) {
      return NextResponse.json({ 
        error: 'Database connection not available'
      }, { status: 500 });
    }

    // Query to get all enriched plans
    const enrichedPlansQuery = `
      SELECT 
        id, name, provider, base_price, category,
        plan_name_es, plan_name_en,
        description_es, description_en,
        tags, target_demographic,
        coverage_type, monthly_premium, deductible,
        requires_medical, price_range, features,
        external_link, rating, reviews,
        created_at, updated_at
      FROM insurance_plans
      WHERE plan_name_es IS NOT NULL
      ORDER BY id;
    `;

    const result = await pool.query(enrichedPlansQuery);

    // Transform the data for better display
    const enrichedPlans = result.rows.map(plan => ({
      id: plan.id,
      originalName: plan.name,
      provider: plan.provider,
      basePrice: plan.base_price,
      category: plan.category,
      multilingual: {
        nameEs: plan.plan_name_es,
        nameEn: plan.plan_name_en,
        descriptionEs: plan.description_es,
        descriptionEn: plan.description_en
      },
      targeting: {
        tags: plan.tags || [],
        demographic: plan.target_demographic || [],
        coverageType: plan.coverage_type
      },
      pricing: {
        monthlyPremium: plan.monthly_premium,
        deductible: plan.deductible,
        priceRange: plan.price_range,
        requiresMedical: plan.requires_medical
      },
      features: plan.features,
      metadata: {
        rating: plan.rating,
        reviews: plan.reviews,
        externalLink: plan.external_link,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
      }
    }));

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_plans,
        COUNT(plan_name_es) as enriched_plans,
        COUNT(DISTINCT coverage_type) as coverage_types,
        COUNT(DISTINCT provider) as providers
      FROM insurance_plans;
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    // Get coverage type distribution
    const coverageDistQuery = `
      SELECT coverage_type, COUNT(*) as count
      FROM insurance_plans
      WHERE coverage_type IS NOT NULL
      GROUP BY coverage_type
      ORDER BY count DESC;
    `;

    const coverageDistResult = await pool.query(coverageDistQuery);

    return NextResponse.json({
      success: true,
      summary: {
        totalPlans: parseInt(stats.total_plans),
        enrichedPlans: parseInt(stats.enriched_plans),
        coverageTypes: parseInt(stats.coverage_types),
        providers: parseInt(stats.providers),
        enrichmentPercentage: Math.round((parseInt(stats.enriched_plans) / parseInt(stats.total_plans)) * 100)
      },
      coverageDistribution: coverageDistResult.rows,
      enrichedPlans: enrichedPlans,
      sampleFeatures: enrichedPlans.length > 0 ? enrichedPlans[0].features : null,
      sampleTags: enrichedPlans.length > 0 ? enrichedPlans[0].targeting.tags : []
    });

  } catch (error) {
    console.error('Enriched plans query error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch enriched plans',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 