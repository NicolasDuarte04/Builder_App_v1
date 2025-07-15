import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { insuranceType, coverageTarget, budget, city, userId } = body;

    // Validate required fields
    if (!insuranceType || !coverageTarget || !budget || !city) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save onboarding session' },
        { status: 500 }
      );
    }

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