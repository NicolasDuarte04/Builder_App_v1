import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json();
    
    // Get current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      // Continue without user if not authenticated
    }

    // Prepare onboarding data
    const onboardingData = {
      user_id: user?.id || null,
      insurance_type: answers.insuranceType,
      age_range: answers.age,
      family_status: answers.familyStatus,
      location: answers.location,
      budget_range: answers.budget,
      current_insurance: answers.currentInsurance,
      priority: answers.priority,
      email_quotes: answers.email === 'yes',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert into onboarding table
    const { data, error } = await supabase
      .from('onboarding_responses')
      .insert([onboardingData])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save onboarding data' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: data[0],
      message: 'Onboarding data saved successfully' 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 