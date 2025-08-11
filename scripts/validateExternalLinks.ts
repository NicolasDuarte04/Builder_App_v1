/*
  Usage:
    ts-node scripts/validateExternalLinks.ts --limit 100
    ts-node scripts/validateExternalLinks.ts --provider "SURA"
    ts-node scripts/validateExternalLinks.ts --limit 200 --dryRun
*/

import { Pool } from 'pg';
import { request } from 'undici';
import pLimit from 'p-limit';
import { DOMAIN_MAP, isOnAllowedDomain } from '../src/data/domainMap';

type PlanRow = {
  id: string | number;
  provider: string;
  external_link: string | null;
};

const argv = process.argv.slice(2);
function getFlag(name: string): string | undefined {
  const idx = argv.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return undefined;
  const arg = argv[idx];
  if (arg.includes('=')) return arg.split('=')[1];
  return argv[idx + 1];
}

const limitFlag = Number(getFlag('limit') || '100');
const providerFlag = getFlag('provider');
const dryRun = argv.includes('--dryRun') || argv.includes('--dry-run');

const pool = new Pool({
  connectionString: process.env.RENDER_POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function fetchPlans(): Promise<PlanRow[]> {
  const params: any[] = [];
  let sql = `SELECT id, provider, external_link FROM insurance_plans WHERE external_link IS NOT NULL`;
  if (providerFlag) {
    sql += ` AND provider ILIKE $1`;
    params.push(`%${providerFlag}%`);
  }
  sql += ` ORDER BY id ASC LIMIT $${params.length + 1}`;
  params.push(limitFlag);
  const res = await pool.query(sql, params);
  return res.rows;
}

function onAllowedDomain(provider: string, url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const allowed = DOMAIN_MAP[provider];
    if (!allowed) return true; // permissive if unknown
    return allowed.some(d => host === d || host.endsWith(`.${d.toLowerCase()}`));
  } catch {
    return false;
  }
}

async function headOrGet(url: string, maxRedirects = 5): Promise<{ status: number; finalUrl: string } | null> {
  try {
    let currentUrl = url;
    for (let i = 0; i <= maxRedirects; i++) {
      try {
        const res = await request(currentUrl, { method: 'HEAD', maxRedirections: maxRedirects, headers: { 'user-agent': 'BrikiLinkValidator/1.0' } });
        const status = res.statusCode;
        const finalUrl = res.url ?? currentUrl;
        if (status >= 200 && status < 400) return { status, finalUrl };
        // some providers block HEAD; try GET
        const getRes = await request(currentUrl, { method: 'GET', maxRedirections: maxRedirects, headers: { 'user-agent': 'BrikiLinkValidator/1.0' } });
        return { status: getRes.statusCode, finalUrl: getRes.url ?? currentUrl };
      } catch (e) {
        // try GET if HEAD failed
        const getRes = await request(currentUrl, { method: 'GET', maxRedirections: maxRedirects, headers: { 'user-agent': 'BrikiLinkValidator/1.0' } });
        return { status: getRes.statusCode, finalUrl: getRes.url ?? currentUrl };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function updatePlan(id: string | number, fields: { link_status: string; final_url: string | null; last_verified_at: string; provider_official_domain: string | null; }) {
  const { link_status, final_url, last_verified_at, provider_official_domain } = fields;
  const sql = `
    UPDATE insurance_plans
    SET link_status = $1,
        final_url = $2,
        last_verified_at = $3,
        provider_official_domain = $4
    WHERE id = $5
  `;
  await pool.query(sql, [link_status, final_url, last_verified_at, provider_official_domain, id]);
}

async function main() {
  if (!process.env.RENDER_POSTGRES_URL) {
    console.error('Missing RENDER_POSTGRES_URL');
    process.exit(1);
  }

  const plans = await fetchPlans();
  console.log(`Validating ${plans.length} plans${providerFlag ? ` for provider ${providerFlag}` : ''} with concurrency ${Math.min(10, limitFlag)}`);

  const limiter = pLimit(Math.min(10, limitFlag));
  const now = new Date().toISOString();
  const results: Array<{ id: string | number; provider: string; input: string; status: string; final?: string | null } > = [];

  await Promise.all(
    plans.map(plan => limiter(async () => {
      const allowed = DOMAIN_MAP[plan.provider] || null;
      let link_status: 'valid' | 'redirected' | 'broken' = 'broken';
      let final_url: string | null = null;
      if (plan.external_link) {
        // Basic timeout and single retry
        let res = await headOrGet(plan.external_link);
        if (!res) res = await headOrGet(plan.external_link);
        if (res && res.status >= 200 && res.status < 400 && onAllowedDomain(plan.provider, res.finalUrl)) {
          link_status = res.finalUrl !== plan.external_link ? 'redirected' : 'valid';
          final_url = res.finalUrl;
        } else {
          link_status = 'broken';
          final_url = null;
        }
      }
      results.push({ id: plan.id, provider: plan.provider, input: plan.external_link || '', status: link_status, final: final_url });
      if (!dryRun) {
        await updatePlan(plan.id, { link_status, final_url, last_verified_at: now, provider_official_domain: allowed ? allowed[0] : null });
      }
    }))
  );

  // Print a small table
  console.log('\nID\tProvider\tStatus\tFinal URL');
  for (const r of results.slice(0, 20)) {
    console.log(`${r.id}\t${r.provider}\t${r.status}\t${r.final ?? ''}`);
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


