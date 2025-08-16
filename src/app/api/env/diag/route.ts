export const runtime = 'nodejs';

export async function GET() {
  const ds = process.env.BRIKI_DATA_SOURCE || null;
  const disableLegacy = String(process.env.DISABLE_LEGACY_PLANS || 'false') === 'true';
  return new Response(
    JSON.stringify({
      ok: true,
      datasource: ds,
      node_env: process.env.NODE_ENV,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL),
      disableLegacy,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}


