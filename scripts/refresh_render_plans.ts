#!/usr/bin/env ts-node

/**
 * Refresh Render Postgres insurance_plans with flat JSON dataset.
 *
 * Usage:
 *   npx ts-node scripts/refresh_render_plans.ts data/transformed-insurance-plans.json
 *
 * Notes:
 * - Reads connection string from process.env.RENDER_POSTGRES_URL
 * - Does not modify app code or Supabase
 */

import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

type FlatPlan = {
  name: string;
  provider: string;
  category: string;
  currency: string;
  base_price: number;
  external_link?: string | null;
  quote_link?: string | null;
  benefits: unknown; // expect array
  tags?: string[];
  country?: string;
};

type ValidatedPlan = {
  name: string;
  provider: string;
  category: string;
  currency: string;
  base_price: number;
  external_link: string;
  quote_link: string;
  benefits: unknown[];
  tags: string[] | null;
  country: string;
  is_quote_flow: boolean; // computed, not persisted if column doesn't exist
};

const ALLOWED_CATEGORIES = new Set([
  'auto', 'salud', 'vida', 'hogar', 'viaje', 'empresarial', 'mascotas', 'educacion',
]);
const ALLOWED_CURRENCIES = new Set(['COP', 'USD', 'MXN']);

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeString(value: string): string {
  return value.trim();
}

function validateAndNormalize(raw: any, index: number): ValidatedPlan {
  const errors: string[] = [];

  const name = typeof raw.name === 'string' ? normalizeString(raw.name) : '';
  const provider = typeof raw.provider === 'string' ? normalizeString(raw.provider) : '';
  const category = typeof raw.category === 'string' ? raw.category.toLowerCase().trim() : '';
  const currency = typeof raw.currency === 'string' ? raw.currency.toUpperCase().trim() : '';
  const base_price = typeof raw.base_price === 'number' ? Math.round(raw.base_price) : NaN;

  const ext = (raw.external_link ?? raw.quote_link) as string | null | undefined;
  const external_link = typeof ext === 'string' ? ext.trim() : '';
  const quote_link = external_link;

  const benefits = Array.isArray(raw.benefits) ? raw.benefits : [];
  const tags = Array.isArray(raw.tags) ? raw.tags : null;
  const country = typeof raw.country === 'string' ? raw.country : 'CO';

  if (!name) errors.push('name is required');
  if (!provider) errors.push('provider is required');
  if (!category) errors.push('category is required');
  if (!currency) errors.push('currency is required');
  if (!Number.isFinite(base_price) || base_price < 0) errors.push('base_price must be >= 0');
  if (!external_link) errors.push('external_link is required');
  if (!isHttpUrl(external_link)) errors.push('external_link must be http(s) URL');
  if (!ALLOWED_CATEGORIES.has(category)) errors.push(`invalid category '${category}'`);
  if (!ALLOWED_CURRENCIES.has(currency)) errors.push(`invalid currency '${currency}'`);
  if (!Array.isArray(benefits) || benefits.length === 0) errors.push('benefits must be a non-empty array');

  if (errors.length) {
    const idText = name && provider ? `${name} — ${provider}` : `index ${index}`;
    throw new Error(`Validation failed for ${idText}: ${errors.join('; ')}`);
  }

  return {
    name,
    provider,
    category,
    currency,
    base_price,
    external_link,
    quote_link,
    benefits,
    tags,
    country,
    is_quote_flow: base_price === 0,
  };
}

async function main() {
  const datasetArg = process.argv[2] || 'data/transformed-insurance-plans.json';
  const datasetPath = path.isAbsolute(datasetArg)
    ? datasetArg
    : path.join(process.cwd(), datasetArg);

  const connStr = process.env.RENDER_POSTGRES_URL;
  if (!connStr) {
    throw new Error('RENDER_POSTGRES_URL is not set');
  }

  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Load dataset
  const rawContent = await fs.readFile(datasetPath, 'utf8');
  const parsed: any = JSON.parse(rawContent);

  // Support two shapes:
  // 1) Flat array of plans
  // 2) Object with { data: [ { attributes: { field: { value } } } ] }
  let rawArray: any[];
  if (Array.isArray(parsed)) {
    rawArray = parsed;
  } else if (parsed && Array.isArray(parsed.data)) {
    // Flatten WebHound-like shape to flat objects expected by validator
    rawArray = parsed.data.map((row: any) => {
      const a = row.attributes || {};
      const get = (k: string) => (a[k] && a[k].value !== undefined ? a[k].value : null);
      return {
        name: get('name'),
        provider: get('provider'),
        category: get('category'),
        base_price: get('base_price'),
        is_quote_flow: get('is_quote_flow'),
        currency: get('currency'),
        external_link: get('external_link'),
        benefits: get('benefits'),
        brochure_link: get('brochure_link'),
        coverage_amount: get('coverage_amount'),
        rating: get('rating'),
        reviews: get('reviews'),
        country: get('country') || 'CO',
        tags: get('tags') || [],
        created_at: get('created_at'),
        updated_at: get('updated_at'),
      } as FlatPlan & Record<string, any>;
    });
  } else {
    throw new Error('Dataset must be an array or an object with a data array');
  }

  // Validate and dedupe
  const validated: ValidatedPlan[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  rawArray.forEach((item: FlatPlan, idx: number) => {
    try {
      const v = validateAndNormalize(item, idx);
      const key = `${v.name.toLowerCase()}|${v.provider.toLowerCase()}`;
      if (!seen.has(key)) {
        validated.push(v);
        seen.add(key);
      }
    } catch (e) {
      errors.push((e as Error).message);
    }
  });

    if (errors.length) {
      console.log('⚠️  Some rows failed validation:');
      errors.slice(0, 20).forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
      if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
      // Intentionally stop on validation errors to avoid partial/dirty data
      throw new Error(`Validation errors: ${errors.length}`);
    }

    // Connect and create staging table
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DROP TABLE IF EXISTS insurance_plans_staging');
      await client.query("CREATE TABLE insurance_plans_staging (LIKE insurance_plans INCLUDING ALL)");

      // Insert into staging (minimal set of columns we will later copy over)
      const insertCols = [
        'name', 'provider', 'base_price', 'currency', 'category',
        'benefits', 'external_link', 'quote_link', 'is_external',
        'country', 'reviews', 'rating', 'data_source', 'last_synced_at', 'created_at', 'updated_at', 'tags'
      ];

      const now = new Date();
      for (const p of validated) {
        const values = [
          p.name,
          p.provider,
          p.base_price,
          p.currency,
          p.category,
          JSON.stringify(p.benefits), // jsonb
          p.external_link,
          p.quote_link,
          true, // is_external
          p.country || 'CO',
          0, // reviews
          '4.5', // rating
          'flat_json', // data_source
          now,
          now,
          now,
          p.tags ?? null,
        ];

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
          `INSERT INTO insurance_plans_staging (${insertCols.join(', ')}) VALUES (${placeholders})`,
          values,
        );
      }

      // Swap into main table in one transaction
      await client.query('TRUNCATE TABLE insurance_plans');
      await client.query(
        `INSERT INTO insurance_plans (${insertCols.join(', ')})
         SELECT ${insertCols.join(', ')} FROM insurance_plans_staging`
      );
      await client.query('DROP TABLE insurance_plans_staging');
      await client.query('COMMIT');

      // Summary logs
      console.log('\n🎉 Refresh completed successfully');
      console.log(`📊 Inserted rows: ${validated.length}`);

      // Counts by category
      const counts = await pool.query(
        `SELECT category, COUNT(*)::int AS count
         FROM insurance_plans
         GROUP BY category
         ORDER BY category`
      );
      console.log('\n📈 Counts by category:');
      counts.rows.forEach(r => console.log(`  ${r.category}: ${r.count}`));

      // First 3 items
      const first3 = await pool.query(
        `SELECT id, name, provider, category, base_price, currency, external_link
         FROM insurance_plans
         ORDER BY id ASC
         LIMIT 3`
      );
      console.log('\n🧪 First 3 items:');
      first3.rows.forEach((r: any, i: number) => console.log(`  ${i + 1}. ${r.name} — ${r.provider} (${r.category}) ${r.base_price} ${r.currency}`));

      // 10 random link samples
      const links = await pool.query(
        `SELECT name, provider, external_link
         FROM insurance_plans
         WHERE external_link IS NOT NULL
         ORDER BY random()
         LIMIT 10`
      );
      console.log('\n🔗 Random link samples:');
      links.rows.forEach((r: any) => console.log(`  - ${r.name} — ${r.provider}: ${r.external_link}`));

    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Refresh failed:', err.message);
  process.exit(1);
});


