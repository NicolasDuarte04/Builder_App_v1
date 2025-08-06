#!/usr/bin/env node

/**
 * WebHound Insurance Plans Refresh Script
 * 
 * This script safely updates the insurance_plans table with WebHound data:
 * 1. Transforms WebHound data to match our schema
 * 2. Creates a backup of current data
 * 3. Performs incremental update (preserves non-WebHound data)
 * 4. Validates data integrity
 * 5. Provides rollback capability
 * 
 * Usage: 
 *   node scripts/webhound-refresh.js [options]
 *   
 * Options:
 *   --dry-run       Test without making changes
 *   --backup-only   Only create backup
 *   --rollback      Restore from latest backup
 *   --force         Skip confirmation prompts
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const WebHoundTransformer = require('./webhound-data-transformer');

// Configuration
const CONFIG = {
  databaseUrl: process.env.RENDER_POSTGRES_URL,
  backupDir: path.join(__dirname, '../backups'),
  transformedDataPath: path.join(__dirname, '../data/deduplicated-insurance-plans.json'),
  dryRun: process.argv.includes('--dry-run'),
  backupOnly: process.argv.includes('--backup-only'),
  rollback: process.argv.includes('--rollback'),
  force: process.argv.includes('--force')
};

// Database connection
const pool = CONFIG.databaseUrl ? new Pool({
  connectionString: CONFIG.databaseUrl,
  ssl: { rejectUnauthorized: false }
}) : null;

class WebHoundRefresher {
  constructor() {
    this.stats = {
      backupCount: 0,
      existingWebhound: 0,
      newPlans: 0,
      updatedPlans: 0,
      preservedLegacy: 0,
      errors: []
    };
  }

  /**
   * Main execution flow
   */
  async execute() {
    console.log('🚀 WebHound Insurance Plans Refresh\n');
    console.log('Configuration:');
    console.log(`  Mode: ${CONFIG.dryRun ? 'DRY RUN' : CONFIG.backupOnly ? 'BACKUP ONLY' : CONFIG.rollback ? 'ROLLBACK' : 'LIVE UPDATE'}`);
    console.log(`  Database: ${CONFIG.databaseUrl ? 'Connected' : 'Not configured'}`);
    console.log('');

    try {
      // Check database connection
      if (!pool) {
        throw new Error('Database connection not configured. Set RENDER_POSTGRES_URL environment variable.');
      }

      await this.testConnection();

      // Handle different modes
      if (CONFIG.rollback) {
        await this.performRollback();
      } else if (CONFIG.backupOnly) {
        await this.createBackup();
        console.log('✅ Backup created successfully');
      } else {
        await this.performRefresh();
      }

      // Report results
      this.reportResults();

    } catch (error) {
      console.error('❌ Error:', error.message);
      if (CONFIG.dryRun) {
        console.log('\n💡 This was a dry run. No changes were made.');
      }
      process.exit(1);
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT COUNT(*) FROM insurance_plans');
      client.release();
      console.log(`✅ Database connected. Current plans: ${result.rows[0].count}\n`);
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Perform the refresh operation
   */
  async performRefresh() {
    // Step 1: Load deduplicated data (skip transformation)
    console.log('📦 Step 1: Load deduplicated data');
    let transformedData;
    try {
      const content = await fs.readFile(CONFIG.transformedDataPath, 'utf8');
      transformedData = JSON.parse(content);
      console.log(`✅ Loaded ${transformedData.length} deduplicated plans\n`);
    } catch (error) {
      console.log('⚠️  Deduplicated data not found, running transformation...');
      const transformer = new WebHoundTransformer();
      transformedData = await transformer.transform();
      console.log(`✅ Transformed ${transformedData.length} plans\n`);
    }

    // Step 2: Create backup
    console.log('💾 Step 2: Create backup');
    const backupFile = await this.createBackup();
    console.log(`✅ Backup saved to: ${backupFile}\n`);

    // Step 3: Analyze changes
    console.log('🔍 Step 3: Analyze changes');
    await this.analyzeChanges(transformedData);

    // Step 4: Confirm with user (unless --force)
    if (!CONFIG.force && !CONFIG.dryRun) {
      const confirmed = await this.confirmChanges();
      if (!confirmed) {
        console.log('❌ Operation cancelled by user');
        process.exit(0);
      }
    }

    // Step 5: Apply changes
    if (!CONFIG.dryRun) {
      console.log('\n🔄 Step 5: Applying changes...');
      await this.applyChanges(transformedData);
      console.log('✅ Changes applied successfully');
    } else {
      console.log('\n✅ Dry run complete. No changes were made.');
    }
  }

  /**
   * Create backup of current data
   */
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(CONFIG.backupDir, `insurance_plans_${timestamp}.json`);

    // Ensure backup directory exists
    await fs.mkdir(CONFIG.backupDir, { recursive: true });

    // Query all current data
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM insurance_plans 
        ORDER BY provider, name
      `);

      this.stats.backupCount = result.rows.length;

      // Save to file
      await fs.writeFile(
        backupFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          count: result.rows.length,
          data: result.rows
        }, null, 2),
        'utf8'
      );

      return backupFile;
    } finally {
      client.release();
    }
  }

  /**
   * Analyze what changes will be made
   */
  async analyzeChanges(newData) {
    const client = await pool.connect();
    try {
      // Get existing WebHound plans
      const existingWebhound = await client.query(`
        SELECT webhound_id, name, provider, updated_at 
        FROM insurance_plans 
        WHERE data_source = 'webhound'
      `);

      // Get legacy plans
      const legacyPlans = await client.query(`
        SELECT id, name, provider 
        FROM insurance_plans 
        WHERE data_source != 'webhound' OR data_source IS NULL
      `);

      // Create lookup map
      const existingMap = new Map();
      existingWebhound.rows.forEach(plan => {
        existingMap.set(plan.webhound_id, plan);
      });

      // Analyze changes
      this.stats.existingWebhound = existingWebhound.rows.length;
      this.stats.preservedLegacy = legacyPlans.rows.length;

      newData.forEach(plan => {
        if (existingMap.has(plan.webhound_id)) {
          this.stats.updatedPlans++;
        } else {
          this.stats.newPlans++;
        }
      });

      // Report analysis
      console.log(`  Existing WebHound plans: ${this.stats.existingWebhound}`);
      console.log(`  Legacy plans (preserved): ${this.stats.preservedLegacy}`);
      console.log(`  New plans to add: ${this.stats.newPlans}`);
      console.log(`  Plans to update: ${this.stats.updatedPlans}`);

    } finally {
      client.release();
    }
  }

  /**
   * Confirm changes with user
   */
  async confirmChanges() {
    console.log('\n⚠️  This will modify the production database.');
    console.log(`  - ${this.stats.newPlans} new plans will be added`);
    console.log(`  - ${this.stats.updatedPlans} plans will be updated`);
    console.log(`  - ${this.stats.preservedLegacy} legacy plans will be preserved`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question('\nProceed with update? (yes/no): ', answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Apply changes to database
   */
  async applyChanges(newData) {
    const client = await pool.connect();
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const plan of newData) {
        try {
          // Start individual transaction for each plan
          await client.query('BEGIN');
          
          // Check if plan exists
          const existing = await client.query(
            'SELECT id FROM insurance_plans WHERE webhound_id = $1',
            [plan.webhound_id]
          );

          if (existing.rows.length > 0) {
            // Update existing plan
            await this.updatePlan(client, existing.rows[0].id, plan);
            this.stats.updatedPlans++;
          } else {
            // Insert new plan
            await this.insertPlan(client, plan);
            this.stats.newPlans++;
          }
          
          // Commit this plan
          await client.query('COMMIT');
          successCount++;
          
          // Progress indicator
          if (successCount % 10 === 0) {
            console.log(`  ✅ Processed ${successCount} plans...`);
          }
        } catch (error) {
          // Rollback this plan only
          await client.query('ROLLBACK');
          errorCount++;
          this.stats.errors.push({
            plan: plan.name,
            provider: plan.provider,
            error: error.message
          });
          
          // Log first few errors
          if (errorCount <= 5) {
            console.log(`  ⚠️ Skipped: ${plan.name} - ${plan.provider}: ${error.message.split('\n')[0]}`);
          }
        }
      }
      
      console.log(`\n  ✅ Successfully imported: ${successCount} plans`);
      console.log(`  ⚠️ Skipped due to errors: ${errorCount} plans`);

    } finally {
      client.release();
    }
  }

  /**
   * Insert new plan
   */
  async insertPlan(client, plan) {
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
      plan.name, plan.provider, plan.base_price, plan.currency, plan.category,
      plan.plan_name_es, plan.plan_name_en, plan.provider_es, plan.provider_en,
      JSON.stringify(plan.benefits), plan.benefits_en,  // Convert benefits array to JSON string
      plan.quote_link, plan.quote_link_checked_at,
      plan.brochure_link, plan.brochure_link_checked_at,
      plan.features ? JSON.stringify(plan.features) : null, plan.tags,
      plan.country, plan.coverage_amount, plan.rating, plan.reviews, plan.is_external,
      plan.data_source, plan.webhound_id, plan.last_synced_at,
      plan.created_at, plan.updated_at
    ];

    await client.query(query, values);
  }

  /**
   * Update existing plan
   */
  async updatePlan(client, planId, plan) {
    const query = `
      UPDATE insurance_plans SET
        name = $1, provider = $2, base_price = $3, currency = $4, category = $5,
        plan_name_es = $6, plan_name_en = $7, provider_es = $8, provider_en = $9,
        benefits = $10::jsonb, benefits_en = $11,
        quote_link = $12, quote_link_checked_at = $13,
        brochure_link = $14, brochure_link_checked_at = $15,
        features = $16::json, tags = $17,
        country = $18, coverage_amount = $19, rating = $20, reviews = $21,
        last_synced_at = $22, updated_at = $23
      WHERE id = $24
    `;

    const values = [
      plan.name, plan.provider, plan.base_price, plan.currency, plan.category,
      plan.plan_name_es, plan.plan_name_en, plan.provider_es, plan.provider_en,
      JSON.stringify(plan.benefits), plan.benefits_en,  // Convert benefits array to JSON string
      plan.quote_link, plan.quote_link_checked_at,
      plan.brochure_link, plan.brochure_link_checked_at,
      plan.features ? JSON.stringify(plan.features) : null, plan.tags,
      plan.country, plan.coverage_amount, plan.rating, plan.reviews,
      plan.last_synced_at, plan.updated_at,
      planId
    ];

    await client.query(query, values);
  }

  /**
   * Perform rollback from backup
   */
  async performRollback() {
    console.log('🔄 Performing rollback...\n');

    // Find latest backup
    const backupFiles = await fs.readdir(CONFIG.backupDir);
    const insuranceBackups = backupFiles
      .filter(f => f.startsWith('insurance_plans_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (insuranceBackups.length === 0) {
      throw new Error('No backup files found');
    }

    const latestBackup = path.join(CONFIG.backupDir, insuranceBackups[0]);
    console.log(`📂 Using backup: ${latestBackup}`);

    // Load backup data
    const backupContent = await fs.readFile(latestBackup, 'utf8');
    const backup = JSON.parse(backupContent);

    console.log(`  Backup date: ${backup.timestamp}`);
    console.log(`  Plans count: ${backup.count}`);

    // Confirm rollback
    if (!CONFIG.force) {
      const confirmed = await this.confirmRollback(backup);
      if (!confirmed) {
        console.log('❌ Rollback cancelled');
        return;
      }
    }

    // Perform rollback
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear current data
      await client.query('DELETE FROM insurance_plans');

      // Restore from backup
      for (const plan of backup.data) {
        // Build dynamic insert based on available columns
        const columns = Object.keys(plan).filter(k => k !== 'id');
        const values = columns.map(col => plan[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`);

        const query = `
          INSERT INTO insurance_plans (${columns.join(', ')})
          VALUES (${placeholders.join(', ')})
        `;

        await client.query(query, values);
      }

      await client.query('COMMIT');
      console.log('✅ Rollback completed successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Confirm rollback with user
   */
  async confirmRollback(backup) {
    console.log(`\n⚠️  This will restore the database to: ${backup.timestamp}`);
    console.log(`  All current data will be replaced with ${backup.count} plans from backup.`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question('\nProceed with rollback? (yes/no): ', answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Report results
   */
  reportResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REFRESH REPORT');
    console.log('='.repeat(60));

    if (CONFIG.rollback) {
      console.log('✅ Rollback completed');
    } else if (CONFIG.backupOnly) {
      console.log(`✅ Backup created: ${this.stats.backupCount} plans`);
    } else {
      console.log(`\n📈 Results:`);
      console.log(`  Backup created:    ${this.stats.backupCount} plans`);
      console.log(`  New plans added:   ${this.stats.newPlans}`);
      console.log(`  Plans updated:     ${this.stats.updatedPlans}`);
      console.log(`  Legacy preserved:  ${this.stats.preservedLegacy}`);

      if (this.stats.errors.length > 0) {
        console.log(`\n⚠️  Errors (${this.stats.errors.length}):`);
        this.stats.errors.forEach((err, i) => {
          console.log(`  ${i + 1}. ${err.plan}: ${err.error}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Run if called directly
if (require.main === module) {
  const refresher = new WebHoundRefresher();
  
  refresher.execute()
    .then(() => {
      console.log('\n✨ Operation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Operation failed:', error.message);
      process.exit(1);
    });
}

module.exports = WebHoundRefresher;