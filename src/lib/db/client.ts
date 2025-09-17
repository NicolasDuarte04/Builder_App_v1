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
  
  // Configuración SSL basada en el entorno
  const isProduction = process.env.NODE_ENV === 'production';
  const sslConfig = isProduction 
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false };
  
  pool = new Pool({ 
    connectionString: url, 
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  // Manejo de errores del pool
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
  
  return pool;
}

export async function sql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[] }> {
  const p = getPool();
  try {
    const result = await p.query(query, params);
    return { rows: result.rows as T[] };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Cerrar pool al terminar la aplicación
process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);