# Preview Branch: plans_v2_shadow

This branch (`feat/v2-shadow-preview`) is for a Vercel Preview deployment to validate the new v2 data source without impacting Production.

- Do NOT merge to `main` without explicit approval.
- Do NOT enable `BRIKI_DATA_SOURCE=plans_v2` in Production yet.
- Preview env vars (Vercel → Project → Preview):
  - `BRIKI_DATA_SOURCE=plans_v2_shadow`
  - `DATABASE_URL=<Render Postgres URL>` (mirror from Production if safe)

Smoke tests
- `/api/plans_v2/diag` → returns counts/sample
- `/api/plans_v2/search?country=CO&includeCategories=salud&limit=5` → returns non-empty list
- UI: `/assistant` → ask “health insurance (no dental)” and “education insurance”; cards should have non-zero prices; where `brochure_link` differs from `external_link`, show Quote + View Policy.

Rollback
- Switch `BRIKI_DATA_SOURCE` to `legacy` in Preview, or simply discard this branch.
