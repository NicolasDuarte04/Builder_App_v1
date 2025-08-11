import { NextResponse } from 'next/server';
import { pool } from '@/lib/render-db';

export async function POST(request: Request) {
  try {
    const { authorization } = await request.json();
    if (authorization !== 'phase2-migration-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!pool) {
      return NextResponse.json({ 
        error: 'Database connection not available',
        message: 'RENDER_POSTGRES_URL environment variable not set'
      }, { status: 500 });
    }

    const alterSql = `
      ALTER TABLE insurance_plans
        ADD COLUMN IF NOT EXISTS link_status TEXT CHECK (link_status IN ('valid','redirected','broken')),
        ADD COLUMN IF NOT EXISTS final_url TEXT,
        ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS provider_official_domain TEXT;
    `;

    await pool.query(alterSql);

    const verify = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'insurance_plans'
        AND column_name IN ('link_status','final_url','last_verified_at','provider_official_domain')
      ORDER BY column_name;
    `);

    return NextResponse.json({ success: true, added: verify.rows });
  } catch (error) {
    console.error('Add link columns error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}


