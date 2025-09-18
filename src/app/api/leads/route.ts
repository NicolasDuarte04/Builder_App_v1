import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
export const runtime = 'nodejs';

const supabase = createClient(
  env.server.SUPABASE_URL,
  env.server.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request: NextRequest) {
  console.log("📥 API: POST /api/leads called");

  // env.server validation guarantees required keys

  try {
    const body = await request.json();
    console.log("📦 Request body:", body);
    
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      company, 
      website, 
      employees, 
      country 
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !company || !website || !employees || !country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log("🗄️ Inserting into Supabase client-information table with data:", {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      company: company,
      website: website,
      employees: employees,
      country: country,
    });

    // Insert the lead information
    const { data, error } = await supabase
      .from('client-information')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        company: company,
        website: website,
        employees: employees,
        country: country,
        created_at: new Date().toISOString(),
        status: 'new' // Default status for new leads
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
        { error: 'Failed to save lead information' },
        { status: 500 }
      );
    }

    console.log('✅ Supabase insert successful:', data);
    return NextResponse.json({ 
      success: true, 
      leadId: data.id,
      message: 'Lead information saved successfully' 
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
