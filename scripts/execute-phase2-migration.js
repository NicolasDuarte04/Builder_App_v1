const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.error('Warning: Could not load .env.local file:', error.message);
  }
}

// Load environment variables
loadEnvFile();

async function executeMigration() {
  const dbUrl = process.env.RENDER_POSTGRES_URL || process.env.RENDER_DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ Error: RENDER_POSTGRES_URL not found in environment variables');
    console.error('Please ensure your .env.local file contains RENDER_POSTGRES_URL');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Starting Phase 2 Migration: Adding nullable fields to insurance_plans table...\n');

    // Read the migration SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', '002_add_insurance_plan_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    console.log('📝 Executing ALTER TABLE statement...');
    await pool.query(migrationSQL);
    console.log('✅ ALTER TABLE executed successfully!\n');

    // Verify the migration
    console.log('🔍 Verifying schema update...');
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'insurance_plans'
      AND column_name IN (
        'tags', 'plan_name_en', 'plan_name_es', 'description_en', 'description_es',
        'features', 'price_range', 'target_demographic', 'monthly_premium',
        'deductible', 'max_age', 'min_age', 'requires_medical', 'coverage_type',
        'partner_priority'
      )
      ORDER BY column_name;
    `;

    const result = await pool.query(verifyQuery);
    
    console.log('\n📊 New columns added:');
    console.log('┌─────────────────────────┬──────────────────┬────────────┐');
    console.log('│ Column Name             │ Data Type        │ Nullable   │');
    console.log('├─────────────────────────┼──────────────────┼────────────┤');
    
    result.rows.forEach(row => {
      const colName = row.column_name.padEnd(23);
      const dataType = row.data_type.padEnd(16);
      const nullable = row.is_nullable === 'YES' ? 'Yes' : 'No';
      console.log(`│ ${colName} │ ${dataType} │ ${nullable.padEnd(10)} │`);
    });
    
    console.log('└─────────────────────────┴──────────────────┴────────────┘');
    
    console.log(`\n✅ Migration complete! Added ${result.rows.length} new columns.`);

    // Test backward compatibility
    console.log('\n🧪 Testing backward compatibility...');
    const testQuery = 'SELECT id, name, provider, base_price FROM insurance_plans LIMIT 1';
    const testResult = await pool.query(testQuery);
    
    if (testResult.rows.length > 0) {
      console.log('✅ Existing queries still work! Sample plan:');
      console.log(`   - ${testResult.rows[0].name} by ${testResult.rows[0].provider}`);
    } else {
      console.log('⚠️  No plans found in database');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🎉 Phase 2 complete! Schema successfully enhanced with nullable fields.');
  }
}

// Execute the migration
executeMigration(); 