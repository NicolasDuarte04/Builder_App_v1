import { NextRequest, NextResponse } from 'next/server';
import { pool as sharedPool } from '@/lib/render-db';
import { Pool } from 'pg';
import { env as brikiEnv, getServerVar } from '@/lib/env';

export const runtime = 'nodejs';

function getSafePool(): Pool | null {
  if (sharedPool) return sharedPool as unknown as Pool;
  const conn = getServerVar('RENDER_POSTGRES_URL');
  if (!conn) return null;
  return new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
}

export async function GET(req: NextRequest) {
  try {
    const headerToken = req.headers.get('x-diag-token');
    const expected = getServerVar('DIAG_TOKEN');
    if (!expected || headerToken !== expected) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const build = {
      commit: brikiEnv.server.VERCEL_GIT_COMMIT_SHA ?? 'local',
      branch: brikiEnv.server.VERCEL_GIT_COMMIT_REF ?? 'local',
    };

    const env = {
      has_RENDER_POSTGRES_URL: !!getServerVar('RENDER_POSTGRES_URL'),
      has_DATABASE_URL: !!getServerVar('DATABASE_URL'),
      has_OPENAI_API_KEY: !!brikiEnv.server.OPENAI_API_KEY,
      validate_openai_response: getServerVar('VALIDATE_OPENAI_RESPONSE') ?? 'unset',
    };

    const pool = getSafePool();
    let connectable = false;
    let insurance_plans_count = 0;
    let educacion_count = 0;
    let sample: Array<{ id: string | number; name: string; base_price: number; external_link: string | null }>
      = [];

    if (pool) {
      try {
        await pool.query('SELECT 1');
        connectable = true;

        const totalRes = await pool.query('SELECT COUNT(*)::int AS c FROM insurance_plans');
        insurance_plans_count = totalRes.rows[0]?.c ?? 0;

        const eduRes = await pool.query(
          "SELECT COUNT(*)::int AS c FROM insurance_plans WHERE category = 'educacion'"
        );
        educacion_count = eduRes.rows[0]?.c ?? 0;

        const sampleRes = await pool.query(
          "SELECT id, name, base_price, external_link FROM insurance_plans WHERE category = 'educacion' ORDER BY id DESC LIMIT 2"
        );
        sample = sampleRes.rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          base_price: typeof r.base_price === 'number' ? r.base_price : Number(r.base_price) || 0,
          external_link: r.external_link ?? null,
        }));
      } catch {
        connectable = false;
      } finally {
        // Only end local pools; shared pool is managed by the app
        if (pool && pool !== (sharedPool as unknown as Pool)) {
          await pool.end().catch(() => {});
        }
      }
    }

    return NextResponse.json({ build, env, db: { connectable, insurance_plans_count, educacion_count, sample } });
  } catch (err) {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}


