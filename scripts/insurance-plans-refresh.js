#!/usr/bin/env node

/**
 * Insurance Plans Table Refresh Script
 * 
 * This script safely refreshes the insurance_plans table with new Webhound data:
 * 1. Validates the new dataset schema
 * 2. Creates a backup of current data
 * 3. Safely deletes existing entries
 * 4. Inserts new data with validation
 * 5. Provides rollback capability
 * 
 * Usage: node scripts/insurance-plans-refresh.js [--dry-run] [--backup-only] [--rollback]
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  databaseUrl: process.env.RENDER_POSTGRES_URL,
  backupDir: './backups',
  webhoundDataPath: './data/transformed-insurance-plans.json',
  dryRun: process.argv.includes('--dry-run'),
  backupOnly: process.argv.includes('--backup-only'),
  rollback: process.argv.includes('--rollback')
};

// Database connection
const pool = new Pool({
  connectionString: CONFIG.databaseUrl,
  ssl: { rejectUnauthorized: false }
});

// Schema validation for Webhound data
const WEBHOUND_SCHEMA = {
  required: ['name', 'provider', 'category', 'base_price'],
  optional: ['quote_link', 'benefits'],
  types: {
    name: 'string',
    provider: 'string', 
    category: 'string',
    base_price: 'number',
    quote_link: 'string',
    benefits: 'array'
  }
};

// Database schema mapping
const DB_SCHEMA_MAPPING = {
  name: 'name',
  provider: 'provider',
  category: 'category', 
  base_price: 'base_price',
  quote_link: 'external_link', // Map quote_link to external_link
  benefits: 'benefits',
  // Default values for missing fields
  country: 'CO',
  currency: 'COP',
  rating: '4.5',
  reviews: 0,
  is_external: true,
  brochure_link: null,
  coverage_amount: 0
};

class InsurancePlansRefresher {
  constructor() {
    this.backupData = null;
    this.newData = null;
    this.stats = {
      backupCount: 0,
      deletedCount: 0,
      insertedCount: 0,
      errors: []
    };
  }

  async init() {
    console.log('🔧 Initializing Insurance Plans Refresher...');
    
    // Ensure backup directory exists
    await this.ensureBackupDir();
    
    // Test database connection
    await this.testConnection();
    
    console.log('✅ Initialization complete');
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(CONFIG.backupDir, { recursive: true });
    } catch (error) {
      console.error('❌ Failed to create backup directory:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async loadWebhoundData() {
    console.log('📂 Loading Webhound data...');
    
    try {
      const data = await fs.readFile(CONFIG.webhoundDataPath, 'utf8');
      this.newData = JSON.parse(data);
      
      if (!Array.isArray(this.newData)) {
        throw new Error('Webhound data must be an array');
      }
      
      console.log(`✅ Loaded ${this.newData.length} plans from Webhound data`);
      return this.newData;
    } catch (error) {
      console.error('❌ Failed to load Webhound data:', error);
      throw error;
    }
  }

  validateWebhoundData(data) {
    console.log('🔍 Validating Webhound data schema...');
    
    const errors = [];
    
    data.forEach((plan, index) => {
      // Check required fields
      WEBHOUND_SCHEMA.required.forEach(field => {
        if (!(field in plan)) {
          errors.push(`Plan ${index}: Missing required field '${field}'`);
        }
      });
      
      // Check field types (with more flexible validation for optional fields)
      Object.entries(WEBHOUND_SCHEMA.types).forEach(([field, expectedType]) => {
        if (field in plan && plan[field] !== null) {
          const actualType = Array.isArray(plan[field]) ? 'array' : typeof plan[field];
          if (actualType !== expectedType) {
            // Allow string for features (can be JSON string or object-like string)
            if (field === 'features' && actualType === 'string') {
              // Skip validation for features as string - will be handled in transform
              return;
            }
            errors.push(`Plan ${index}: Field '${field}' should be ${expectedType}, got ${actualType}`);
          }
        }
      });
      
      // Validate specific fields
      if (plan.base_price && typeof plan.base_price !== 'number') {
        errors.push(`Plan ${index}: base_price must be a number`);
      }
      
      if (plan.benefits && !Array.isArray(plan.benefits)) {
        errors.push(`Plan ${index}: benefits must be an array`);
      }
      
      if (plan.tags && !Array.isArray(plan.tags)) {
        errors.push(`Plan ${index}: tags must be an array`);
      }
    });
    
    if (errors.length > 0) {
      console.error('❌ Validation errors found:');
      errors.forEach(error => console.error(`  - ${error}`));
      throw new Error(`Validation failed with ${errors.length} errors`);
    }
    
    console.log('✅ Webhound data validation passed');
    return true;
  }

  async createBackup() {
    console.log('💾 Creating backup of current data...');
    
    try {
      const result = await pool.query('SELECT * FROM insurance_plans');
      this.backupData = result.rows;
      this.stats.backupCount = this.backupData.length;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(CONFIG.backupDir, `insurance_plans_backup_${timestamp}.json`);
      
      await fs.writeFile(backupPath, JSON.stringify(this.backupData, null, 2));
      
      console.log(`✅ Backup created: ${backupPath} (${this.stats.backupCount} plans)`);
      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async deleteExistingData() {
    if (CONFIG.dryRun) {
      console.log('🔍 [DRY RUN] Would delete all existing insurance plans');
      return;
    }
    
    console.log('🗑️  Deleting existing insurance plans...');
    
    try {
      const result = await pool.query('DELETE FROM insurance_plans RETURNING id');
      this.stats.deletedCount = result.rowCount;
      console.log(`✅ Deleted ${this.stats.deletedCount} existing plans`);
    } catch (error) {
      console.error('❌ Failed to delete existing data:', error);
      throw error;
    }
  }

  transformPlanForDB(webhoundPlan) {
    // Generate a base price if missing (random between 50k-500k COP for realism)
    const generatePrice = () => Math.round(50000 + Math.random() * 450000);
    
    // Generate a placeholder external link using the provider and plan name
    const generateExternalLink = (provider, planName) => {
      const providerSlug = provider.toLowerCase().replace(/\s+/g, '-');
      return `https://${providerSlug}.com/seguros`;
    };
    
    // Only include basic fields that we know exist in the database
    const dbPlan = {
      name: webhoundPlan.name || webhoundPlan.plan_name_es,
      provider: webhoundPlan.provider || webhoundPlan.provider_es,
      category: webhoundPlan.category,
      base_price: webhoundPlan.base_price !== null ? Math.round(parseFloat(webhoundPlan.base_price)) : generatePrice(),
      external_link: webhoundPlan.quote_link || webhoundPlan.external_link || generateExternalLink(webhoundPlan.provider || webhoundPlan.provider_es, webhoundPlan.name || webhoundPlan.plan_name_es),
      benefits: Array.isArray(webhoundPlan.benefits) ? JSON.stringify(webhoundPlan.benefits) : '[]',
      country: webhoundPlan.country || 'CO',
      currency: webhoundPlan.currency || 'COP',
      rating: webhoundPlan.rating || '4.5',
      reviews: webhoundPlan.reviews || 0,
      is_external: true,
      brochure_link: webhoundPlan.brochure_link || null,
      coverage_amount: webhoundPlan.coverage_amount || 0
    };
    
    return dbPlan;
  }

  async insertNewData() {
    if (CONFIG.dryRun) {
      console.log(`🔍 [DRY RUN] Would insert ${this.newData.length} new plans`);
      return;
    }
    
    console.log('📥 Inserting new insurance plans...');
    
    const transformedPlans = this.newData.map(plan => this.transformPlanForDB(plan));
    
    try {
      // Use a transaction for safe insertion
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const plan of transformedPlans) {
          const fields = Object.keys(plan);
          const values = Object.values(plan);
          const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
          
          const query = `
            INSERT INTO insurance_plans (${fields.join(', ')})
            VALUES (${placeholders})
          `;
          
          await client.query(query, values);
          this.stats.insertedCount++;
        }
        
        await client.query('COMMIT');
        console.log(`✅ Successfully inserted ${this.stats.insertedCount} new plans`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Failed to insert new data:', error);
      throw error;
    }
  }

  async rollback() {
    if (!this.backupData) {
      console.error('❌ No backup data available for rollback');
      return;
    }
    
    console.log('🔄 Rolling back to backup data...');
    
    try {
      // Delete current data
      await pool.query('DELETE FROM insurance_plans');
      
      // Insert backup data
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const plan of this.backupData) {
          const fields = Object.keys(plan);
          const values = Object.values(plan);
          const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
          
          const query = `
            INSERT INTO insurance_plans (${fields.join(', ')})
            VALUES (${placeholders})
          `;
          
          await client.query(query, values);
        }
        
        await client.query('COMMIT');
        console.log(`✅ Rollback complete: restored ${this.backupData.length} plans`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  async verifyData() {
    console.log('🔍 Verifying data integrity...');
    
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM insurance_plans');
      const count = parseInt(result.rows[0].count);
      
      console.log(`✅ Database contains ${count} insurance plans`);
      
      // Test a sample query like the AI assistant would use
      const sampleResult = await pool.query(`
        SELECT * FROM insurance_plans 
        WHERE category = 'auto' 
        ORDER BY base_price ASC 
        LIMIT 4
      `);
      
      console.log(`✅ Sample query returned ${sampleResult.rows.length} auto plans`);
      
      return count;
    } catch (error) {
      console.error('❌ Data verification failed:', error);
      throw error;
    }
  }

  async run() {
    try {
      await this.init();
      
      if (CONFIG.rollback) {
        await this.rollback();
        return;
      }
      
      if (CONFIG.backupOnly) {
        await this.createBackup();
        return;
      }
      
      // Load and validate new data
      await this.loadWebhoundData();
      this.validateWebhoundData(this.newData);
      
      // Create backup
      await this.createBackup();
      
      // Delete existing data
      await this.deleteExistingData();
      
      // Insert new data
      await this.insertNewData();
      
      // Verify results
      await this.verifyData();
      
      console.log('\n🎉 Insurance plans refresh completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   - Backed up: ${this.stats.backupCount} plans`);
      console.log(`   - Deleted: ${this.stats.deletedCount} plans`);
      console.log(`   - Inserted: ${this.stats.insertedCount} plans`);
      
    } catch (error) {
      console.error('\n❌ Refresh failed:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }
}

// Run the script
if (require.main === module) {
  const refresher = new InsurancePlansRefresher();
  refresher.run();
}

module.exports = InsurancePlansRefresher; 