import { Pool } from 'pg';

const connectionString =
  process.env.CATALOG_DB_RO_URL || process.env.CATALOG_DB_URL;

if (!connectionString) {
  throw new Error('[ENV] Missing CATALOG_DB_URL or CATALOG_DB_RO_URL');
}

export const catalogPool = new Pool({
  connectionString,
  max: 5,
  ssl: { rejectUnauthorized: false },
});

export async function q<T = unknown>(sql: string, params: unknown[] = []) {
  const c = await catalogPool.connect();
  try {
    const r = await c.query(sql as any, params as any);
    return r.rows as T[];
  } finally {
    c.release();
  }
}


