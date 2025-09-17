### Catalog DB on Render (Postgres)

Short guide to wire the Catalog database hosted on Render, run migrations/seeds, verify health, understand fallback, and roll back locally.

## Getting the database URLs (Render Dashboard)
- Primary (RW): in your Render PostgreSQL service, open Connections and copy the External Database URL.
- Pooled (RO): copy the Pooled/Transaction (pgBouncer) URL if available.
- Always append `?sslmode=require` to both URLs.

Example env vars you can place in your shell or `.env.local`:

```bash
export CATALOG_DB_URL='postgres://user:pass@host:5432/dbname?sslmode=require'           # Primary (RW)
# Optional read-only via pgBouncer
export CATALOG_DB_RO_URL='postgres://user:pass@pool-host:5432/dbname?sslmode=require'   # Pooled (RO)
```

## Commands

```bash
# Point to your Render Primary (RW) URL (must include ?sslmode=require)
export CATALOG_DB_URL='postgres://.../dbname?sslmode=require'

# Run the migration that creates public.plans_v2
npm run db:catalog:migrate

# Seed sample data for Autos (CO)
psql "$CATALOG_DB_URL" -f scripts/catalog_seed_autos_co.sql

# Health check (schema): hits GET /api/plans_v2/selftest?__schema=1
npm run db:catalog:check
```

The self-test endpoint should return JSON like:

```json
{ "using": "CATALOG_DB_URL", "db": "…", "schema": "public", "server_version_num": 160002, "plans_v2_exists": true }
```

## Fallback behavior
- If env is missing or the connection fails, `POST /api/plans_v2/search` still returns **200**.
- In degraded mode the API serves results from the bundled JSON fallback. Conceptually this is equivalent to:

```json
{ "degraded": true, "source": "fallback" }
```

- Implementation detail: the response sets headers `x-catalog-degraded: true` and `x-catalog-source: fallback` while the body contains the plan list from the JSON fallback.

## Rollback to fallback locally
- Remove/unset any Catalog DB env and restart dev to force fallback:

```bash
unset CATALOG_DB_URL CATALOG_DB_RO_URL
pnpm dev:clean
```

After rollback, `POST /api/plans_v2/search` will continue responding with 200 using the JSON fallback.


