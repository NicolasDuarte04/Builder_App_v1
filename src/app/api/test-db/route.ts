import { NextResponse } from 'next/server';
import { testConnection, getInsuranceTypes } from '@/lib/render-db';

export async function GET() {
  try {
    console.log('🧪 Testing Render PostgreSQL connection...');
    
    // Test basic connection
    const isConnected = await testConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    }

    // Get available insurance types
    const insuranceTypes = await getInsuranceTypes();
    
    console.log('✅ Database connection test successful');
    console.log('📊 Available insurance types:', insuranceTypes);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      insuranceTypes,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 