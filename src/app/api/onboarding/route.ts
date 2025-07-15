import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if environment variables are available
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
}

// Use anon key if service role key is not available (for development)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key available');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey || ''
);

export async function POST(request: NextRequest) {
  console.log("📥 API: POST /api/onboarding called");
  
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
    console.error('❌ Supabase environment variables not configured');
    return NextResponse.json(
      { error: 'Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY' },
      { status: 500 }
    );
  }
  
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
      console.error('❌ Supabase error:', error);
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

  } catch (error) {
    console.error('API error:', error);
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
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch onboarding sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 