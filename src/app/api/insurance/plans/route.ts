import { NextRequest, NextResponse } from 'next/server';
import { queryInsurancePlans, getInsuranceTypes, testConnection } from '@/lib/render-db';

export async function GET(request: NextRequest) {
  try {
    // Test database connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Get available insurance types
    const insuranceTypes = await getInsuranceTypes();
    
    return NextResponse.json({
      success: true,
      insuranceTypes,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('❌ Error in GET /api/insurance/plans:', error);
    return NextResponse.json(
      { error: 'Failed to get insurance types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { insuranceType, budget, preferences, limit = 4 } = body;

    console.log('🔍 Insurance plan query request:', {
      insuranceType,
      budget,
      preferences,
      limit
    });

    // Validate required parameters
    if (!insuranceType) {
      return NextResponse.json(
        { error: 'insuranceType is required' },
        { status: 400 }
      );
    }

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Query insurance plans with filters
    const plans = await queryInsurancePlans({
      type: insuranceType,
      maxPremium: budget ? parseFloat(budget) : undefined,
      preferences: preferences || [],
      limit: parseInt(limit) || 4
    });

    console.log(`✅ Found ${plans.length} insurance plans for ${insuranceType}`);

    return NextResponse.json({
      success: true,
      plans,
      count: plans.length,
      filters: {
        type: insuranceType,
        budget,
        preferences
      }
    });

  } catch (error) {
    console.error('❌ Error in POST /api/insurance/plans:', error);
    return NextResponse.json(
      { 
        error: 'Failed to query insurance plans',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 