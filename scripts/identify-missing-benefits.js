#!/usr/bin/env node

/**
 * Identify Plans with Missing Benefits
 * Lists plans that need benefit enrichment
 */

const fs = require('fs').promises;
const path = require('path');

async function identifyMissingBenefits() {
  console.log('📝 Identifying Plans with Missing Benefits\n');
  console.log('='.repeat(60));
  
  try {
    // Load transformation errors
    const errorsPath = path.join(__dirname, '../data/transformation-errors.json');
    const errorsContent = await fs.readFile(errorsPath, 'utf8');
    const errors = JSON.parse(errorsContent);
    
    // Filter for benefit-related errors
    const benefitErrors = errors.filter(err => 
      err.error.includes('benefits must have at least')
    );
    
    console.log(`Found ${benefitErrors.length} plans with insufficient benefits\n`);
    
    // Load the original data to get more details
    const originalPath = path.join(__dirname, '../data/webhound-insurance_plan.json');
    const originalContent = await fs.readFile(originalPath, 'utf8');
    const originalData = JSON.parse(originalContent);
    
    console.log('Plans needing benefit enrichment:\n');
    
    const enrichmentNeeded = [];
    
    benefitErrors.forEach((err, index) => {
      // Find the original plan
      const originalPlan = originalData.data.find(p => p.id === err.id);
      
      if (originalPlan) {
        const planInfo = {
          id: err.id,
          name: err.plan,
          provider: originalPlan.attributes.provider_es?.value || 'Unknown',
          category: originalPlan.attributes.category?.value || 'Unknown',
          currentBenefits: originalPlan.attributes.benefits?.value || [],
          benefitCount: originalPlan.attributes.benefits?.value?.length || 0,
          quote_link: originalPlan.attributes.quote_link?.value || 'N/A'
        };
        
        enrichmentNeeded.push(planInfo);
        
        console.log(`${index + 1}. ${planInfo.name}`);
        console.log(`   Provider: ${planInfo.provider}`);
        console.log(`   Category: ${planInfo.category}`);
        console.log(`   Current benefits (${planInfo.benefitCount}):`);
        
        if (planInfo.currentBenefits.length > 0) {
          planInfo.currentBenefits.forEach((benefit, i) => {
            console.log(`     ${i + 1}. ${benefit.substring(0, 80)}${benefit.length > 80 ? '...' : ''}`);
          });
        }
        
        console.log(`   Quote link: ${planInfo.quote_link}`);
        console.log('');
      }
    });
    
    // Save enrichment report
    const reportPath = path.join(__dirname, '../data/benefits-enrichment-needed.json');
    await fs.writeFile(
      reportPath,
      JSON.stringify(enrichmentNeeded, null, 2),
      'utf8'
    );
    
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total plans needing enrichment: ${enrichmentNeeded.length}`);
    console.log(`\nFull report saved to: ${reportPath}`);
    
    // Suggest generic benefits based on category
    console.log('\n💡 SUGGESTED GENERIC BENEFITS BY CATEGORY:\n');
    
    const suggestions = {
      'salud': [
        'Consultas médicas generales ilimitadas',
        'Exámenes de laboratorio básicos incluidos',
        'Atención de urgencias 24/7'
      ],
      'vida': [
        'Cobertura por muerte natural o accidental',
        'Asistencia funeraria incluida',
        'Protección financiera para beneficiarios'
      ],
      'auto': [
        'Responsabilidad civil obligatoria',
        'Asistencia vial 24 horas',
        'Cobertura de daños a terceros'
      ],
      'viaje': [
        'Asistencia médica en el extranjero',
        'Cobertura de equipaje perdido',
        'Cancelación de viaje por emergencia'
      ]
    };
    
    // Group plans by category
    const byCategory = {};
    enrichmentNeeded.forEach(plan => {
      if (!byCategory[plan.category]) {
        byCategory[plan.category] = [];
      }
      byCategory[plan.category].push(plan.name);
    });
    
    Object.entries(byCategory).forEach(([category, plans]) => {
      console.log(`${category.toUpperCase()} (${plans.length} plans):`);
      
      if (suggestions[category]) {
        console.log('  Suggested additional benefits:');
        suggestions[category].forEach((benefit, i) => {
          console.log(`    ${i + 1}. ${benefit}`);
        });
      } else {
        console.log('  No generic suggestions available for this category');
      }
      
      console.log('  Affected plans:');
      plans.slice(0, 3).forEach(plan => {
        console.log(`    - ${plan}`);
      });
      if (plans.length > 3) {
        console.log(`    ... and ${plans.length - 3} more`);
      }
      console.log('');
    });
    
    console.log('='.repeat(60));
    console.log('\n📌 NEXT STEPS:');
    console.log('1. Review the benefits-enrichment-needed.json file');
    console.log('2. Add generic benefits based on category');
    console.log('3. Or manually research each plan via quote_link');
    console.log('4. Update the source data and re-run transformation');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  identifyMissingBenefits();
}