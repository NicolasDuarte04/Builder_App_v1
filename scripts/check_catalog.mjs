#!/usr/bin/env node

// Node 18+ script to verify that the plans_v2 table exists via the selftest endpoint.
// Usage: BASE=http://localhost:3000 node scripts/check_catalog.mjs

async function main() {
  const defaultBase = 'http://localhost:3000';
  const envBase = process.env.BASE && typeof process.env.BASE === 'string' ? process.env.BASE.trim() : '';
  const base = envBase || defaultBase;

  let url;
  try {
    url = new URL('/api/plans_v2/selftest', base);
    url.searchParams.set('__schema', '1');
  } catch (e) {
    console.error(`Invalid BASE URL: ${base}`);
    process.exit(1);
  }

  const controller = new AbortController();
  const timeoutMsFromEnv = Number.parseInt(process.env.TIMEOUT_MS || '', 10);
  const timeoutMs = Number.isFinite(timeoutMsFromEnv) && timeoutMsFromEnv > 0 ? timeoutMsFromEnv : 10000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Selftest failed: HTTP ${res.status} ${res.statusText}${body ? `\n${body}` : ''}`);
      process.exit(1);
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.error('Invalid JSON from selftest endpoint');
      process.exit(1);
    }

    if (data && data.plans_v2_exists === true) {
      const requireNonEmptyEnv = (process.env.REQUIRE_CATALOG_NONEMPTY || '').toString().toLowerCase();
      const requireNonEmpty = requireNonEmptyEnv === '1' || requireNonEmptyEnv === 'true' || requireNonEmptyEnv === 'yes' || requireNonEmptyEnv === 'on';

      if (!requireNonEmpty) {
        console.log('OK');
        return;
      }

      // Optional: also verify that the catalog is non-empty and being used (not fallback)
      const searchUrl = new URL('/api/plans_v2/search', base);
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), timeoutMs);
      try {
        const res2 = await fetch(searchUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'accept': 'application/json' },
          body: JSON.stringify({ country: 'CO', limit: 1 }),
          signal: controller2.signal,
        });
        clearTimeout(timeout2);

        if (!res2.ok) {
          const body2 = await res2.text().catch(() => '');
          console.error(`Catalog non-empty check failed: HTTP ${res2.status} ${res2.statusText}${body2 ? `\n${body2}` : ''}`);
          process.exit(1);
        }

        let data2;
        try {
          data2 = await res2.json();
        } catch (e) {
          console.error('Invalid JSON from search endpoint');
          process.exit(1);
        }

        const source = (res2.headers.get('x-catalog-source') || '').toLowerCase();
        const degraded = (res2.headers.get('x-catalog-degraded') || '').toLowerCase();
        const items = Array.isArray(data2?.items) ? data2.items : [];

        if (source !== 'catalog' || degraded === 'true' || items.length < 1) {
          console.error(`Catalog appears empty or fallback used. source=${source || 'unknown'} degraded=${degraded || 'unknown'} count=${items.length}`);
          process.exit(1);
        }

        console.log('OK');
        return;
      } catch (err2) {
        if (err2 && err2.name === 'AbortError') {
          console.error(`Search request timed out after ${timeoutMs}ms: ${searchUrl.toString()}`);
        } else {
          console.error(`Catalog non-empty check error: ${err2?.message || String(err2)}`);
        }
        process.exit(1);
      }
    }

    const details = `plans_v2_exists=${String(data?.plans_v2_exists)} using=${String(data?.using ?? 'unknown')} db=${String(data?.db ?? 'null')} schema=${String(data?.schema ?? 'null')}`;
    console.error(`plans_v2 table not found or unknown. ${details}`);
    process.exit(1);
  } catch (err) {
    if (err && err.name === 'AbortError') {
      console.error(`Selftest request timed out after ${timeoutMs}ms: ${url.toString()}`);
    } else {
      console.error(`Selftest request error: ${err?.message || String(err)}`);
    }
    process.exit(1);
  }
}

main();


