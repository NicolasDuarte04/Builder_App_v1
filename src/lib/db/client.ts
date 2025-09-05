import { Pool } from 'pg';
import { getDatabaseUrl, getDbMode, type DbMode } from './env';

let pool: Pool | null = null;

export function dbMode(): DbMode {
  return getDbMode();
}

export function getPool(): Pool {
  if (pool) return pool;
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error('DATABASE_URL not set');
  }
  pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  return pool;
}

export async function sql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[] }>
{
  const p = getPool();
  return p.query(query, params);
}


