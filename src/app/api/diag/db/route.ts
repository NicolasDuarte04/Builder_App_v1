import { NextResponse } from 'next/server';
import pg from 'pg';

export const runtime = 'nodejs';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL || '';
  const dbUrlLen = dbUrl.length;

  let ok = false;
  let err: string | null = null;
  let count: number | null = null;

  if (dbUrlLen > 0) {
    const conn = dbUrl.includes('sslmode=') ? dbUrl : `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}sslmode=require`;
    try {
      const pool = new pg.Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
      const r = await pool.query('SELECT COUNT(*)::int as n FROM insurance_plans');
      count = r.rows?.[0]?.n ?? null;
      ok = true;
      await pool.end();
    } catch (e: any) {
      err = e?.message ?? String(e);
    }
  } else {
    err = 'No DATABASE_URL/RENDER_POSTGRES_URL at runtime';
  }

  return NextResponse.json({ dbUrlLen, ok, count, err });
}
