#!/usr/bin/env node

/**
 * Fix Decimal Prices
 * Converts decimal prices to integers and re-imports the affected plans
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.RENDER_POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixDecimalPrices() {
  console.log('💰 Fixing Decimal Price Plans\n');
  console.log('='.repeat(60));
  
  try {
    // Load the transformed data
    const dataPath = path.join(__dirname, '../data/transformed-insurance-plans.json');
    const content = await fs.readFile(dataPath, 'utf8');
    const allPlans = JSON.parse(content);
    
    // Find plans with decimal prices
    const decimalPlans = allPlans.filter(plan => {
      return !Number.isInteger(plan.base_price) && typeof plan.base_price === 'number';
    });
    
    console.log(`Found ${decimalPlans.length} plans with decimal prices\n`);
    
    if (decimalPlans.length === 0) {
      console.log('No decimal price plans to fix.');
      return;
    }
    
    // Show sample of plans to be fixed
    console.log('Sample plans to fix:');
    decimalPlans.slice(0, 5).forEach(plan => {
      console.log(`  ${plan.name} - ${plan.provider}`);
      console.log(`    Original: ${plan.base_price} ${plan.currency}`);
      console.log(`    Rounded:  ${Math.round(plan.base_price)} ${plan.currency}`);
    });
    
    console.log('\nConversion strategy:');
    console.log('  - Round to nearest integer (standard rounding)');
    console.log('  - This maintains price accuracy within 1 unit');
    
    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirmed = await new Promise(resolve => {
      rl.question('\nProceed with fixing decimal prices? (yes/no): ', answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
    
    if (!confirmed) {
      console.log('Operation cancelled.');
      return;
    }
    
    // Fix and insert the plans
    console.log('\n🔄 Fixing and inserting plans...');
    
    const client = await pool.connect();
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    try {
      for (const plan of decimalPlans) {
        // Round the price
        const fixedPlan = {
          ...plan,
          base_price: Math.round(plan.base_price)
        };
        
        try {
          await client.query('BEGIN');
          
          // Check if plan already exists
          const existing = await client.query(
            'SELECT id FROM insurance_plans WHERE webhound_id = $1',
            [fixedPlan.webhound_id]
          );
          
          if (existing.rows.length > 0) {
            console.log(`  ⏭️ Skipping ${fixedPlan.name} - already exists`);
          } else {
            // Insert the fixed plan
            const query = `
              INSERT INTO insurance_plans (
                name, provider, base_price, currency, category,
                plan_name_es, plan_name_en, provider_es, provider_en,
                benefits, benefits_en,
                quote_link, quote_link_checked_at,
                brochure_link, brochure_link_checked_at,
                features, tags,
                country, coverage_amount, rating, reviews, is_external,
                data_source, webhound_id, last_synced_at,
                created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                $10::jsonb, $11,
                $12, $13,
                $14, $15,
                $16::json, $17,
                $18, $19, $20, $21, $22,
                $23, $24, $25,
                $26, $27
              )
            `;
            
            const values = [
              fixedPlan.name, fixedPlan.provider, fixedPlan.base_price, fixedPlan.currency, fixedPlan.category,
              fixedPlan.plan_name_es, fixedPlan.plan_name_en, fixedPlan.provider_es, fixedPlan.provider_en,
              JSON.stringify(fixedPlan.benefits), fixedPlan.benefits_en,
              fixedPlan.quote_link, fixedPlan.quote_link_checked_at,
              fixedPlan.brochure_link, fixedPlan.brochure_link_checked_at,
              fixedPlan.features ? JSON.stringify(fixedPlan.features) : null, fixedPlan.tags,
              fixedPlan.country, fixedPlan.coverage_amount, fixedPlan.rating, fixedPlan.reviews, fixedPlan.is_external,
              fixedPlan.data_source, fixedPlan.webhound_id, fixedPlan.last_synced_at,
              fixedPlan.created_at, fixedPlan.updated_at
            ];
            
            await client.query(query, values);
            successCount++;
            console.log(`  ✅ Fixed and inserted: ${fixedPlan.name}`);
          }
          
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          errorCount++;
          errors.push({
            plan: fixedPlan.name,
            error: error.message
          });
          console.log(`  ❌ Error: ${fixedPlan.name} - ${error.message.split('\n')[0]}`);
        }
      }
    } finally {
      client.release();
    }
    
    // Report results
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS');
    console.log('='.repeat(60));
    console.log(`  Successfully fixed: ${successCount} plans`);
    console.log(`  Errors: ${errorCount} plans`);
    
    if (errors.length > 0) {
      console.log('\nError details:');
      errors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.plan}: ${err.error}`);
      });
    }
    
    // Verify new total
    const totalResult = await pool.query('SELECT COUNT(*) FROM insurance_plans');
    console.log(`\n📊 New total: ${totalResult.rows[0].count} plans in database`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixDecimalPrices();
}