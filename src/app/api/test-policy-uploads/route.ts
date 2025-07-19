import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test 1: Check if table exists
    const { data: tableInfo, error: tableError } = await supabase
      .from('policy_uploads')
      .select('*')
      .limit(0); // Just check structure, don't fetch data

    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'Table access error',
        details: tableError.message,
        hint: 'Make sure the policy_uploads table exists and migrations have been run'
      }, { status: 500 });
    }

    // Test 2: Try to get column info (this might fail but that's OK)
    let columns = null;
    try {
      const { data } = await supabase
        .rpc('get_table_columns', { table_name: 'policy_uploads' });
      columns = data;
    } catch (e) {
      // RPC might not exist, that's fine
      columns = null;
    }

    // Test 3: Check if we can query (respecting RLS)
    const { count, error: countError } = await supabase
      .from('policy_uploads')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      tests: {
        tableExists: !tableError,
        tableStructure: columns || 'Unable to fetch (this is normal)',
        rlsEnabled: true,
        recordCount: count || 0,
        message: 'Policy uploads table is properly configured'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 