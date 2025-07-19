import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Not set',
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    };

    // Test Supabase connection
    let supabaseStatus = 'Not configured';
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          supabaseStatus = `Error: ${error.message}`;
        } else {
          supabaseStatus = `Connected (${count || 0} users)`;
        }
      } catch (e) {
        supabaseStatus = `Connection failed: ${e}`;
      }
    }

    return NextResponse.json({
      status: 'Auth system check',
      environment: envCheck,
      database: supabaseStatus,
      recommendation: !envCheck.NEXT_PUBLIC_SUPABASE_URL || !envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? 'Please set up Supabase environment variables'
        : !envCheck.NEXTAUTH_SECRET
        ? 'Please set NEXTAUTH_SECRET environment variable'
        : 'Configuration looks good'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 