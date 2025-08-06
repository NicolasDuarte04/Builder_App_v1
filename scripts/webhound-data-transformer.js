#!/usr/bin/env node

/**
 * WebHound Data Transformer
 * Transforms WebHound insurance data to match our database schema
 * 
 * Usage: node scripts/webhound-data-transformer.js
 */

const fs = require('fs').promises;
const path = require('path');

class WebHoundTransformer {
  constructor() {
    // Updated path to match the actual file location
    this.inputPath = path.join(__dirname, '../../data/webhound-insurance_plan.json');
    this.outputPath = path.join(__dirname, '../../data/transformed-insurance-plans.json');
    this.validationErrors = [];
    this.stats = {
      total: 0,
      valid: 0,
      invalid: 0,
      transformed: 0,
      skipped: 0
    };
  }

  /**
   * Main transformation pipeline
   */
  async transform() {
    console.log('🔄 Starting WebHound data transformation...\n');
    
    try {
      // Load data
      const rawData = await this.loadData();
      
      // Validate and transform
      const transformedData = await this.processPlans(rawData);
      
      // Save transformed data
      await this.saveData(transformedData);
      
      // Report results
      this.reportResults();
      
      return transformedData;
    } catch (error) {
      console.error('❌ Transformation failed:', error);
      throw error;
    }
  }

  /**
   * Load WebHound data
   */
  async loadData() {
    console.log(`📂 Loading data from ${this.inputPath}...`);
    
    try {
      const content = await fs.readFile(this.inputPath, 'utf8');
      const data = JSON.parse(content);
      
      // WebHound format has metadata and data array
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid WebHound format: missing data array');
      }
      
      this.stats.total = data.data.length;
      console.log(`✅ Loaded ${data.data.length} plans from WebHound\n`);
      
      return data.data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`WebHound data file not found at ${this.inputPath}`);
      }
      throw error;
    }
  }

  /**
   * Process and transform all plans
   */
  async processPlans(plans) {
    console.log('🔍 Validating and transforming plans...\n');
    
    const transformed = [];
    
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      
      try {
        // Skip invalid or duplicate entries
        if (!plan.is_valid || plan.is_duplicate) {
          this.stats.skipped++;
          continue;
        }
        
        // Extract values from WebHound format
        const extractedPlan = this.extractWebHoundValues(plan);
        
        // Validate required fields
        this.validatePlan(extractedPlan, i);
        
        // Transform to database schema
        const transformedPlan = this.transformPlan(extractedPlan, plan.id);
        
        transformed.push(transformedPlan);
        this.stats.valid++;
        this.stats.transformed++;
        
        // Progress indicator
        if ((i + 1) % 50 === 0) {
          console.log(`  Processed ${i + 1}/${plans.length} plans...`);
        }
      } catch (error) {
        this.stats.invalid++;
        this.validationErrors.push({
          index: i,
          id: plan.id,
          plan: this.extractValue(plan, 'plan_name_es') || `Plan ${i}`,
          error: error.message
        });
      }
    }
    
    console.log(`\n✅ Transformed ${transformed.length} valid plans`);
    console.log(`⏭️  Skipped ${this.stats.skipped} invalid/duplicate plans`);
    
    return transformed;
  }

  /**
   * Extract values from WebHound nested structure
   */
  extractWebHoundValues(plan) {
    const extracted = {};
    
    // Extract all attributes
    if (plan.attributes) {
      Object.keys(plan.attributes).forEach(key => {
        extracted[key] = this.extractValue(plan, key);
      });
    }
    
    // Add metadata
    extracted.id = plan.id;
    extracted.created_at = plan.created_at;
    
    return extracted;
  }

  /**
   * Extract value from WebHound attribute structure
   */
  extractValue(plan, attributeName) {
    if (!plan.attributes || !plan.attributes[attributeName]) {
      return null;
    }
    
    const value = plan.attributes[attributeName].value;
    
    // Handle "N/A" values as null (common for optional URLs)
    if (value === 'N/A' || value === 'n/a') {
      return null;
    }
    
    return value;
  }

  /**
   * Validate a single plan
   */
  validatePlan(plan, index) {
    const required = [
      'plan_name_es',
      'provider_es',
      'base_price',
      'currency',
      'category',
      'quote_link',
      'benefits'
    ];
    
    for (const field of required) {
      if (!plan[field] && plan[field] !== 0) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate data types
    if (typeof plan.base_price !== 'number') {
      throw new Error(`base_price must be a number, got ${typeof plan.base_price}`);
    }
    
    if (!Array.isArray(plan.benefits)) {
      throw new Error('benefits must be an array');
    }
    
    if (plan.benefits.length < 3) {
      throw new Error(`benefits must have at least 3 items, got ${plan.benefits.length}`);
    }
    
    // Validate URLs
    if (!this.isValidUrl(plan.quote_link)) {
      throw new Error(`Invalid quote_link URL: ${plan.quote_link}`);
    }
    
    if (plan.brochure_link && !this.isValidUrl(plan.brochure_link)) {
      throw new Error(`Invalid brochure_link URL: ${plan.brochure_link}`);
    }
    
    // Validate category
    const validCategories = ['salud', 'vida', 'auto', 'viaje', 'hogar', 'dental'];
    if (!validCategories.includes(plan.category.toLowerCase())) {
      throw new Error(`Invalid category: ${plan.category}. Must be one of: ${validCategories.join(', ')}`);
    }
    
    // Validate country
    const validCountries = ['CO', 'MX'];
    if (plan.country && !validCountries.includes(plan.country)) {
      throw new Error(`Invalid country: ${plan.country}. Must be CO or MX`);
    }
  }

  /**
   * Transform WebHound plan to database schema
   */
  transformPlan(webhoundPlan, webhoundId) {
    const now = new Date().toISOString();
    
    return {
      // Core fields
      name: webhoundPlan.plan_name_es,
      provider: webhoundPlan.provider_es,
      base_price: webhoundPlan.base_price,
      currency: webhoundPlan.currency,
      category: webhoundPlan.category.toLowerCase(),
      
      // Multilingual fields
      plan_name_es: webhoundPlan.plan_name_es,
      plan_name_en: webhoundPlan.plan_name_en || null,
      provider_es: webhoundPlan.provider_es,
      provider_en: webhoundPlan.provider_en || null,
      
      // Benefits
      benefits: webhoundPlan.benefits,
      benefits_en: webhoundPlan.benefits_en || [],
      
      // Links with validation timestamps
      quote_link: webhoundPlan.quote_link,
      quote_link_checked_at: webhoundPlan.quote_link_checked_at || now,
      brochure_link: webhoundPlan.brochure_link || null,
      brochure_link_checked_at: webhoundPlan.brochure_link_checked_at || (webhoundPlan.brochure_link ? now : null),
      
      // Optional fields
      features: webhoundPlan.features || null,
      tags: Array.isArray(webhoundPlan.tags) ? webhoundPlan.tags : [],
      
      // Default values for missing fields
      country: webhoundPlan.country || this.inferCountry(webhoundPlan.currency),
      coverage_amount: webhoundPlan.coverage_amount || 0,
      rating: webhoundPlan.rating || '4.5',
      reviews: webhoundPlan.reviews || 0,
      is_external: true,
      
      // Tracking fields
      data_source: 'webhound',
      webhound_id: webhoundId || this.generateWebhoundId(webhoundPlan),
      last_synced_at: now,
      
      // Timestamps
      created_at: webhoundPlan.created_at || now,
      updated_at: now
    };
  }

  /**
   * Infer country from currency
   */
  inferCountry(currency) {
    const currencyMap = {
      'COP': 'CO',
      'MXN': 'MX',
      'USD': 'US',
      'EUR': 'EU'
    };
    
    return currencyMap[currency] || 'CO';
  }

  /**
   * Generate unique WebHound ID
   */
  generateWebhoundId(plan) {
    const provider = plan.provider_es.toLowerCase().replace(/\s+/g, '-');
    const name = plan.plan_name_es.toLowerCase().replace(/\s+/g, '-');
    return `wh_${provider}_${name}`;
  }

  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save transformed data
   */
  async saveData(data) {
    console.log(`\n💾 Saving transformed data to ${this.outputPath}...`);
    
    await fs.writeFile(
      this.outputPath,
      JSON.stringify(data, null, 2),
      'utf8'
    );
    
    console.log('✅ Data saved successfully');
  }

  /**
   * Report transformation results
   */
  reportResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRANSFORMATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Statistics:`);
    console.log(`  Total plans:      ${this.stats.total}`);
    console.log(`  Valid plans:      ${this.stats.valid} (${(this.stats.valid / this.stats.total * 100).toFixed(1)}%)`);
    console.log(`  Invalid plans:    ${this.stats.invalid} (${(this.stats.invalid / this.stats.total * 100).toFixed(1)}%)`);
    console.log(`  Skipped (duplicates/invalid): ${this.stats.skipped}`);
    console.log(`  Transformed:      ${this.stats.transformed}`);
    
    if (this.validationErrors.length > 0) {
      console.log(`\n⚠️  Validation Errors (${this.validationErrors.length}):`);
      
      // Show first 10 errors
      const errorsToShow = this.validationErrors.slice(0, 10);
      errorsToShow.forEach((err, i) => {
        console.log(`  ${i + 1}. Plan "${err.plan}" (index ${err.index}, id: ${err.id}): ${err.error}`);
      });
      
      if (this.validationErrors.length > 10) {
        console.log(`  ... and ${this.validationErrors.length - 10} more errors`);
      }
      
      // Save full error report
      const errorReportPath = path.join(__dirname, '../../data/transformation-errors.json');
      fs.writeFile(
        errorReportPath,
        JSON.stringify(this.validationErrors, null, 2),
        'utf8'
      ).then(() => {
        console.log(`\n  Full error report saved to: ${errorReportPath}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.stats.valid === this.stats.total - this.stats.skipped) {
      console.log('🎉 All valid plans transformed successfully!');
    } else if (this.stats.valid > 0) {
      console.log(`✅ ${this.stats.valid} plans ready for import`);
      console.log(`⚠️  ${this.stats.invalid} plans need attention`);
    } else {
      console.log('❌ No valid plans found. Please check your data.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const transformer = new WebHoundTransformer();
  
  transformer.transform()
    .then(() => {
      console.log('\n✨ Transformation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Transformation failed:', error.message);
      process.exit(1);
    });
}

module.exports = WebHoundTransformer;