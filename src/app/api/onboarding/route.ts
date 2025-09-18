import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
export const runtime = 'nodejs';

const supabase = createClient(
  env.server.SUPABASE_URL,
  env.server.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request: NextRequest) {
  console.log("📥 API: POST /api/onboarding called");
  
  // Non-sensitive boot info
  console.log("Using service role key:", true);
  
  try {
    const body = await request.json();
    console.log("📦 Request body:", body);
    const { insuranceType, coverageTarget, budget, city, userId } = body;

    // Validate required fields
    if (!insuranceType || !coverageTarget || !budget || !city) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log("🗄️ Inserting into Supabase with data:", {
      user_id: userId || null,
      insurance_type: insuranceType,
      coverage_target: coverageTarget,
      budget: budget,
      city: city,
    });

    // Insert the onboarding session
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .insert({
        user_id: userId || null, // null for anonymous users
        insurance_type: insuranceType,
        coverage_target: coverageTarget,
        budget: budget,
        city: city,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { error: 'Failed to save onboarding session' },
        { status: 500 }
      );
    }

    console.log('✅ Supabase insert successful:', data);
    return NextResponse.json({ 
      success: true, 
      sessionId: data.id,
      message: 'Onboarding session saved successfully' 
    });

  } catch (error: any) {
    console.error('API error:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's onboarding sessions
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { error: 'Failed to fetch onboarding sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data });

  } catch (error: any) {
    console.error('API error:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 