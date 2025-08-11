import fs from 'fs';
import { Client } from 'pg';

interface AttributeField<T = any> {
  value: T;
  // WebHound also provides `source_urls`, but we ignore them for import.
}

interface Attributes {
  provider_es?: AttributeField<string>;
  plan_name_es?: AttributeField<string>;
  plan_name_en?: AttributeField<string>;
  category?: AttributeField<string>;
  currency?: AttributeField<string>;
  base_price?: AttributeField<number>;
  external_link?: AttributeField<string>;
  benefits?: AttributeField<string | string[]>;
  features?: AttributeField<unknown>;
}

interface WebHoundRow {
  id: string;
  attributes: Attributes;
}

interface WebHoundFile {
  metadata: unknown;
  data: WebHoundRow[];
}

function pickAttr<T>(attrs: Attributes, key: keyof Attributes): T | null {
  const field = attrs[key] as AttributeField<T> | undefined;
  if (!field) return null;
  const val = field.value as unknown as T;
  if (typeof val === 'string') return (val as unknown as string).trim() as unknown as T;
  return val ?? null;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: ts-node import_webhound_json.ts <path-to-json>');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as WebHoundFile;
  if (!Array.isArray(parsed.data)) {
    console.error('Unexpected JSON shape: `data` is not an array');
    process.exit(1);
  }
  const rows = parsed.data;
  console.log(`Loaded ${rows.length} rows from ${filePath}`);

  if (!process.env.DATABASE_URL && !process.env.RENDER_POSTGRES_URL) {
    console.error('DATABASE_URL or RENDER_POSTGRES_URL env var is required');
    process.exit(1);
  }

  const pg = new Client({
    connectionString: process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  // Build a parameterized insert statement (10 columns).
  const insertSQL = `INSERT INTO insurance_plans_staging
      (name, provider, plan_name_es, plan_name_en, category, currency, base_price, external_link, benefits, features)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`;

  let imported = 0;
  try {
    for (const row of rows) {
      const attrs = row.attributes;
      const benefitsVal = pickAttr<any>(attrs, 'benefits');
      const featuresVal = pickAttr<any>(attrs, 'features');
      await pg.query(insertSQL, [
        pickAttr<string>(attrs, 'plan_name_es') /* name */,
        pickAttr<string>(attrs, 'provider_es'),
        pickAttr<string>(attrs, 'plan_name_es'),
        pickAttr<string>(attrs, 'plan_name_en'),
        pickAttr<string>(attrs, 'category'),
        pickAttr<string>(attrs, 'currency'),
        pickAttr<number>(attrs, 'base_price') ?? 0,
        pickAttr<string>(attrs, 'external_link'),
        benefitsVal == null ? '[]' : JSON.stringify(benefitsVal),
        featuresVal == null ? null : JSON.stringify(featuresVal),
      ]);
      imported++;
      if (imported % 50 === 0) process.stdout.write('.');
    }
    console.log(`\nImported ${imported} rows into insurance_plans_staging`);
  } finally {
    await pg.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
