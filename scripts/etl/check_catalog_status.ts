/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Pool } from 'pg';

// Best-effort load env vars from .env.local or .env
try {
  const dotenv = require('dotenv');
  const root = process.cwd();
  const localPath = path.join(root, '.env.local');
  if (fs.existsSync(localPath)) dotenv.config({ path: localPath });
  else if (fs.existsSync(path.join(root, '.env'))) dotenv.config();
} catch {}

type Row = Record<string, any>;

function getNowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

function getEnvPreferRw(): string {
  const rw = process.env.CATALOG_DB_URL;
  const ro = process.env.CATALOG_DB_RO_URL;
  const url = (rw && rw.trim()) || (ro && ro.trim()) || '';
  if (!url) {
    throw new Error('[ENV] Missing CATALOG_DB_URL (or CATALOG_DB_RO_URL)');
  }
  return url;
}

async function withPool<T>(fn: (pool: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: getEnvPreferRw(), ssl: { rejectUnauthorized: false }, max: 5 });
  try {
    return await fn(pool);
  } finally {
    await pool.end().catch(() => {});
  }
}

async function q<T = Row>(pool: Pool, sql: string, params: unknown[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query(sql as any, params as any);
    return res.rows as T[];
  } finally {
    client.release();
  }
}

async function runCatalogQueries(): Promise<{
  by_provider_category: Row[];
  by_category: Row[];
  providers: Row[];
  freshness_by_provider: Row[];
  pricing_coverage_by_provider: Row[];
}> {
  return withPool(async (pool) => {
    // Detect whether pricing_model column exists to avoid errors on older schemas
    const hasPricingModel = await (async () => {
      try {
        const r = await q<{ exists: boolean }>(
          pool,
          `SELECT EXISTS(
             SELECT 1
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'plans_v2' AND column_name = 'pricing_model'
           ) AS exists`
        );
        return Boolean(r?.[0]?.exists);
      } catch {
        return false;
      }
    })();

    const pricingSql = hasPricingModel
      ? `SELECT provider,
               SUM(CASE WHEN pricing_model = 'quote' THEN 1 ELSE 0 END) AS quote_count,
               SUM(CASE WHEN pricing_model <> 'quote' AND base_price IS NOT NULL THEN 1 ELSE 0 END) AS priced_count,
               COUNT(*) AS total
         FROM public.plans_v2
         GROUP BY provider
         ORDER BY provider`
      : `SELECT provider,
               0::int AS quote_count,
               SUM(CASE WHEN base_price IS NOT NULL THEN 1 ELSE 0 END) AS priced_count,
               COUNT(*) AS total
         FROM public.plans_v2
         GROUP BY provider
         ORDER BY provider`;

    const [by_provider_category, by_category, providers, freshness_by_provider, pricing_coverage_by_provider] = await Promise.all([
      q<Row>(pool, `SELECT provider, category, COUNT(*) AS count FROM public.plans_v2 GROUP BY provider, category ORDER BY provider, category`),
      q<Row>(pool, `SELECT category, COUNT(*) AS count FROM public.plans_v2 GROUP BY category ORDER BY category`),
      q<Row>(pool, `SELECT provider, COUNT(*) AS count FROM public.plans_v2 GROUP BY provider ORDER BY provider`),
      q<Row>(pool, `SELECT provider, MIN(last_verified_at) AS oldest_verified, MAX(last_verified_at) AS newest_verified FROM public.plans_v2 GROUP BY provider ORDER BY provider`),
      q<Row>(pool, pricingSql),
    ]);
    return { by_provider_category, by_category, providers, freshness_by_provider, pricing_coverage_by_provider };
  });
}

async function tryFetchJson(url: string, opts: any): Promise<{ ok: boolean; status?: number; data?: any; error?: string }> {
  try {
    if (typeof fetch === 'function') {
      const resp = await fetch(url, opts);
      const data = await resp.json().catch(() => ({}));
      return { ok: resp.ok, status: resp.status, data };
    }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
  // Fallback to dynamic import of axios if fetch not available
  try {
    const axios = (await import('axios')).default;
    const r = await axios({ url, method: opts?.method || 'GET', data: opts?.body ? JSON.parse(opts.body) : undefined, headers: { 'content-type': 'application/json', ...(opts?.headers || {}) }, timeout: 8000 });
    return { ok: r.status >= 200 && r.status < 300, status: r.status, data: r.data };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function startDevServerDetached(): void {
  try {
    const child = spawn('pnpm', ['dev'], { cwd: process.cwd(), stdio: 'ignore', detached: true, env: process.env });
    child.unref();
    console.log('[check_catalog_status] Started dev server in background (pnpm dev)');
  } catch (e) {
    console.warn('[check_catalog_status] Failed to start dev server automatically:', (e as any)?.message || String(e));
  }
}

async function waitForServer(url: string, timeoutMs = 45000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await tryFetchJson(url, { method: 'GET' });
    if (res.ok || (typeof res.status === 'number' && res.status > 0)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

type ApiProbe = {
  category: string;
  country: string;
  limit: number;
  ok: boolean;
  degraded?: boolean;
  source?: string;
  items?: number;
  first_provider?: string | null;
  first_name?: string | null;
  error?: string;
};

async function runApiProbes(): Promise<ApiProbe[]> {
  const base = process.env.CATALOG_STATUS_API_BASE || 'http://localhost:3000';
  const url = `${base.replace(/\/$/, '')}/api/plans_v2/search`;
  const payloads = [
    { category: 'salud', country: 'CO', limit: 3 },
    { category: 'autos', country: 'CO', limit: 3 },
  ];

  async function postProbe(body: any): Promise<ApiProbe> {
    const res = await tryFetchJson(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return { category: body.category, country: body.country, limit: body.limit, ok: false, error: res.error || `HTTP ${res.status}` };
    const data = res.data || {};
    const items = Array.isArray(data?.items) ? data.items : [];
    const first = items[0] || {};
    return {
      category: body.category,
      country: body.country,
      limit: body.limit,
      ok: Boolean(data?.ok === true || items),
      degraded: Boolean(data?.degraded),
      source: data?.source || null,
      items: items.length,
      first_provider: first?.provider ?? null,
      first_name: first?.name ?? null,
    };
  }

  // First attempt
  const firstResults: ApiProbe[] = [];
  for (const p of payloads) firstResults.push(await postProbe(p));

  // If both probes failed due to connection, try to start dev server and retry once
  const needStart = firstResults.every((r) => r.ok === false && /ECONNREFUSED|fetch failed|connect|Network|ENOTFOUND/i.test(String(r.error || '')));
  if (needStart) {
    startDevServerDetached();
    const ready = await waitForServer(`${base}/api/plans_v2/diag`);
    if (ready) {
      const retryResults: ApiProbe[] = [];
      for (const p of payloads) retryResults.push(await postProbe(p));
      return retryResults;
    }
  }

  return firstResults;
}

function ensureReportsDir(): string {
  const dir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function toMarkdownTables(data: {
  by_provider_category: Row[];
  by_category: Row[];
  providers: Row[];
  freshness_by_provider: Row[];
  pricing_coverage_by_provider: Row[];
}, probes: ApiProbe[]): string {
  const lines: string[] = [];
  const totalPlans = (data.providers || []).reduce((acc, r) => acc + Number(r.count || 0), 0);
  const categoriesPresent = (data.by_category || []).map((r: any) => String(r.category)).join(', ');
  const topProviders = [...(data.providers || [])]
    .sort((a: any, b: any) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, 5)
    .map((r: any) => `${r.provider} (${r.count})`)
    .join(', ');

  lines.push(`# Catalog Status`);
  lines.push('');
  lines.push(`- Plans total: ${totalPlans}`);
  lines.push(`- Categories: ${categoriesPresent}`);
  lines.push(`- Top providers: ${topProviders || '—'}`);
  lines.push('');

  lines.push('## Totals by provider & category');
  lines.push('provider | category | count');
  lines.push('---|---|---');
  for (const r of data.by_provider_category || []) {
    lines.push(`${r.provider} | ${r.category} | ${r.count}`);
  }
  lines.push('');

  lines.push('## Categories');
  lines.push('category | count');
  lines.push('---|---');
  for (const r of data.by_category || []) {
    lines.push(`${r.category} | ${r.count}`);
  }
  lines.push('');

  lines.push('## Providers');
  lines.push('provider | count');
  lines.push('---|---');
  for (const r of data.providers || []) {
    lines.push(`${r.provider} | ${r.count}`);
  }
  lines.push('');

  lines.push('## Freshness by provider');
  lines.push('provider | oldest_verified | newest_verified');
  lines.push('---|---|---');
  for (const r of data.freshness_by_provider || []) {
    lines.push(`${r.provider} | ${r.oldest_verified ?? ''} | ${r.newest_verified ?? ''}`);
  }
  lines.push('');

  lines.push('## Pricing coverage by provider');
  lines.push('provider | quote_count | priced_count | total');
  lines.push('---|---|---|---');
  for (const r of data.pricing_coverage_by_provider || []) {
    lines.push(`${r.provider} | ${r.quote_count} | ${r.priced_count} | ${r.total}`);
  }
  lines.push('');

  lines.push('## API probes');
  for (const p of probes) {
    const src = p.source || 'unknown';
    const items = typeof p.items === 'number' ? p.items : 0;
    const degraded = p.degraded === true ? 'true' : (p.degraded === false ? 'false' : 'n/a');
    lines.push(`- ${p.category} → source=${src}, degraded=${degraded}, items=${items}`);
  }
  lines.push('');

  return lines.join('\n');
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log('[check_catalog_status] Starting at', startedAt);

  // 1) Run catalog SQLs
  let sqlData: Awaited<ReturnType<typeof runCatalogQueries>> | null = null;
  try {
    sqlData = await runCatalogQueries();
    console.log('[check_catalog_status] SQL queries complete');
  } catch (e: any) {
    console.error('[check_catalog_status] SQL failed:', e?.message || String(e));
    // still proceed to API probes, but results will only contain probes
  }

  // 2) API probes
  let probes: ApiProbe[] = [];
  try {
    probes = await runApiProbes();
  } catch (e: any) {
    console.warn('[check_catalog_status] API probes failed:', e?.message || String(e));
  }

  // 3) Write reports
  const when = getNowTimestamp();
  const dir = ensureReportsDir();
  const jsonPath = path.join(dir, `catalog_status_${when}.json`);
  const mdPath = path.join(dir, `catalog_status_${when}.md`);

  const jsonPayload: any = {
    started_at: startedAt,
    by_provider_category: sqlData?.by_provider_category || [],
    by_category: sqlData?.by_category || [],
    providers: sqlData?.providers || [],
    freshness_by_provider: sqlData?.freshness_by_provider || [],
    pricing_coverage_by_provider: sqlData?.pricing_coverage_by_provider || [],
    api_probes: probes,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), 'utf8');
  console.log('[check_catalog_status] Wrote', jsonPath);

  const md = toMarkdownTables(
    {
      by_provider_category: jsonPayload.by_provider_category,
      by_category: jsonPayload.by_category,
      providers: jsonPayload.providers,
      freshness_by_provider: jsonPayload.freshness_by_provider,
      pricing_coverage_by_provider: jsonPayload.pricing_coverage_by_provider,
    },
    probes
  );
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log('[check_catalog_status] Wrote', mdPath);
}

main().catch((e) => {
  console.error('[check_catalog_status] Fatal error:', e);
  process.exitCode = 1;
});


