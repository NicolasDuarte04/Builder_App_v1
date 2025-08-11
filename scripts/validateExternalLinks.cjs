const { Client } = require('pg');
const pLimit = require('p-limit');

const CONCURRENCY = 10;
const OK = (s) => s >= 200 && s < 400;

// Optional allow-list per provider (fill later)
const DOMAIN_MAP = {
  // 'Seguros SURA': ['sura.com', 'segurossura.com.co'],
  // 'Mapfre': ['mapfre.com.co'],
};

function onAllowedDomain(provider, host) {
  const allowed = DOMAIN_MAP[provider];
  if (!allowed || !allowed.length) return true;
  return allowed.some((d) => host.endsWith(d));
}

async function headOrGet(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    if (!res || !OK(res.status)) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    }
    if (!res) return null;
    return { status: res.status, final: res.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function run({ limit = 500, provider = null, dryRun = false }) {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL environment variable');
    process.exit(1);
  }
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const params = [];
  let where = 'external_link IS NOT NULL';
  where += ' AND link_status IS NULL';
  if (provider) {
    params.push(provider);
    where += ` AND provider = $${params.length}`;
  }

  const { rows } = await pg.query(
    `SELECT id, provider, external_link FROM insurance_plans WHERE ${where} ORDER BY id LIMIT ${limit}`,
    params
  );

  const limitFn = pLimit(CONCURRENCY);
  let updated = 0;

  await Promise.all(
    rows.map((r) =>
      limitFn(async () => {
        let status = 'broken';
        let finalUrl = null;

        const res = await headOrGet(r.external_link);
        if (res) {
          finalUrl = res.final;
          let host = '';
          try {
            host = new URL(finalUrl).hostname.toLowerCase();
          } catch {}
          const ok = OK(res.status) && onAllowedDomain(r.provider, host);
          if (ok) status = finalUrl && finalUrl !== r.external_link ? 'redirected' : 'valid';
        }

        if (!dryRun) {
          await pg.query(
            `UPDATE insurance_plans SET link_status = $1, final_url = $2, last_verified_at = now() WHERE id = $3`,
            [status, finalUrl, r.id]
          );
          updated += 1;
        }
      })
    )
  );

  await pg.end();
  console.log(`Processed ${rows.length} rows. ${dryRun ? 'Dry run' : `Updated ${updated}`}.`);
}

const args = process.argv.slice(2);
const getArg = (name, def = null) => {
  const exactIdx = args.findIndex((a) => a === `--${name}`);
  if (exactIdx !== -1) return true;
  const kv = args.find((a) => a.startsWith(`--${name}=`));
  return kv ? kv.split('=').slice(1).join('=') : def;
};

run({
  limit: Number(getArg('limit', 500)),
  provider: getArg('provider', null),
  dryRun: !!getArg('dryRun', false),
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
