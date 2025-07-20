import { NextResponse } from 'next/server';
import { queryInsurancePlans } from '@/lib/render-db';

export async function GET() {
  try {
    // Fetch one insurance plan to analyze schema
    const plans = await queryInsurancePlans({ limit: 1 });
    
    if (!plans || plans.length === 0) {
      return NextResponse.json({
        error: 'No insurance plans found in database',
        availableFields: [],
        samplePlan: null
      }, { status: 404 });
    }

    const samplePlan = plans[0];
    
    // Extract all available fields from the sample plan
    const availableFields = Object.keys(samplePlan).sort();
    
    // Create a clean sample plan object for inspection
    const cleanSamplePlan = {
      name: samplePlan.name,
      provider: samplePlan.provider,
      base_price: samplePlan.base_price,
      base_price_formatted: samplePlan.base_price_formatted,
      benefits: samplePlan.benefits,
      category: samplePlan.category,
      coverage_amount: samplePlan.coverage_amount,
      coverage_amount_formatted: samplePlan.coverage_amount_formatted,
      currency: samplePlan.currency,
      rating: samplePlan.rating,
      reviews: samplePlan.reviews,
      is_external: samplePlan.is_external,
      external_link: samplePlan.external_link,
      brochure_link: samplePlan.brochure_link,
      country: samplePlan.country
    };

    // Log for debugging
    console.log('Schema check - Available fields:', availableFields);
    console.log('Schema check - Sample plan:', cleanSamplePlan);

    return NextResponse.json({
      success: true,
      availableFields,
      samplePlan: cleanSamplePlan,
      totalFieldCount: availableFields.length,
      databaseInfo: {
        source: 'Render PostgreSQL',
        totalPlansCount: await queryInsurancePlans({}).then(p => p.length)
      }
    });

  } catch (error) {
    console.error('Schema check error:', error);
    return NextResponse.json({
      error: 'Failed to check insurance schema',
      message: error instanceof Error ? error.message : 'Unknown error',
      availableFields: [],
      samplePlan: null
    }, { status: 500 });
  }
} 