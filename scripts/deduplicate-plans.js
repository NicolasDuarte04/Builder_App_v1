#!/usr/bin/env node

/**
 * Deduplicate Insurance Plans
 * Removes duplicate plans based on name + provider combination
 * Keeps the first occurrence of each unique plan
 */

const fs = require('fs').promises;
const path = require('path');

async function deduplicatePlans() {
  console.log('🔍 Deduplicating insurance plans...\n');
  
  try {
    // Load transformed data
    const dataPath = path.join(__dirname, '../../data/transformed-insurance-plans.json');
    const content = await fs.readFile(dataPath, 'utf8');
    const plans = JSON.parse(content);
    
    console.log(`📊 Original plans: ${plans.length}`);
    
    // Track seen combinations
    const seen = new Set();
    const deduplicated = [];
    const duplicates = [];
    
    for (const plan of plans) {
      const key = `${plan.name}|${plan.provider}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(plan);
      } else {
        duplicates.push({
          name: plan.name,
          provider: plan.provider,
          webhound_id: plan.webhound_id
        });
      }
    }
    
    console.log(`✅ Unique plans: ${deduplicated.length}`);
    console.log(`⚠️  Duplicates removed: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\n📋 First 10 duplicates removed:');
      duplicates.slice(0, 10).forEach((dup, i) => {
        console.log(`  ${i + 1}. ${dup.name} - ${dup.provider}`);
      });
      
      // Save duplicate report
      const duplicateReportPath = path.join(__dirname, '../../data/duplicate-plans.json');
      await fs.writeFile(
        duplicateReportPath,
        JSON.stringify(duplicates, null, 2),
        'utf8'
      );
      console.log(`\n📄 Full duplicate report saved to: ${duplicateReportPath}`);
    }
    
    // Save deduplicated data
    const outputPath = path.join(__dirname, '../../data/deduplicated-insurance-plans.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(deduplicated, null, 2),
      'utf8'
    );
    
    console.log(`\n💾 Deduplicated data saved to: ${outputPath}`);
    console.log('\n✨ Deduplication complete!');
    
    return deduplicated;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deduplicatePlans();
}

module.exports = deduplicatePlans;