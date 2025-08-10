const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPolicyUploadsTable() {
  console.log('🔧 Checking and fixing policy_uploads table...');

  try {
    // First, check if the table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'policy_uploads');

    if (tableError) {
      console.error('Error checking tables:', tableError);
      // Try a simpler approach - just try to select from the table
      const { error: selectError } = await supabase
        .from('policy_uploads')
        .select('id')
        .limit(1);
      
      if (selectError && selectError.message.includes('relation') && selectError.message.includes('does not exist')) {
        console.log('❌ Table policy_uploads does not exist. Creating it...');
        
        // Create the table using raw SQL
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS policy_uploads (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id TEXT NOT NULL,
            file_name TEXT,
            storage_path TEXT,
            pdf_url TEXT,
            extraction_method TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_policy_uploads_user_id ON policy_uploads(user_id);
          CREATE INDEX IF NOT EXISTS idx_policy_uploads_created_at ON policy_uploads(created_at DESC);
        `;
        
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        
        if (createError) {
          console.error('❌ Failed to create table:', createError);
          console.log('\n📝 Please run this SQL in your Supabase SQL editor:');
          console.log(createTableSQL);
          return;
        }
        
        console.log('✅ Table created successfully!');
      } else if (selectError) {
        console.error('❌ Error accessing policy_uploads table:', selectError);
      } else {
        console.log('✅ Table policy_uploads exists');
      }
    } else {
      console.log('✅ Table policy_uploads exists');
    }

    // Now check the columns
    const { data: columns, error: columnError } = await supabase
      .from('policy_uploads')
      .select('*')
      .limit(0);

    if (!columnError) {
      console.log('✅ Table structure verified');
      
      // Try a test insert (will be rolled back)
      const testInsert = await supabase
        .from('policy_uploads')
        .insert({
          user_id: 'test-user-id',
          file_name: 'test.pdf',
          storage_path: null,
          pdf_url: null,
          extraction_method: null
        })
        .select();
      
      if (testInsert.error) {
        console.error('❌ Test insert failed:', testInsert.error);
        
        if (testInsert.error.message.includes('new row violates row-level security')) {
          console.log('⚠️  RLS is enabled but may be blocking inserts');
          console.log('📝 You may need to temporarily disable RLS or update policies');
        }
      } else {
        // Delete the test record
        if (testInsert.data && testInsert.data[0]) {
          await supabase
            .from('policy_uploads')
            .delete()
            .eq('id', testInsert.data[0].id);
        }
        console.log('✅ Insert test passed');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixPolicyUploadsTable();
