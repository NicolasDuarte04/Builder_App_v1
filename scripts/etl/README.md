Briki ETL: WebHound JSON → BrikiDB v2

This offline ETL converts a WebHound JSON export into a strict BrikiDB v2 dataset. It is deterministic, validated, and reproducible. No network or DB writes.

Prerequisites
- Node 18+
- pnpm (recommended)

Install
```
pnpm install
```

Run ETL
```
# With a specific input file
pnpm tsx scripts/etl/transform.ts data/webhound_export.json

# Without arg (uses the bundled sample input)
pnpm tsx scripts/etl/transform.ts
```

Outputs (written to `scripts/etl/dist/`)
- `plans_v2.json` – Array of valid PlanV2 rows
- `plans_v2.csv` – CSV with the same columns as PlanV2
- `plans_v2.sql` – `INSERT INTO plans_v2 (...) VALUES (...);`
- `plans_v2_rejected.json` – Rejected source rows with reasons
- `plans_v2_report.json` – Summary report with counts, pricing stats, link quality, benefit length distribution

Validate Output
```
pnpm tsx scripts/etl/check.ts
```

Files
- `transform.ts` – main ETL (reads input JSON, writes outputs)
- `schema.ts` – Zod schemas for input (loose) and output (strict)
- `mappings.ts` – category/tags mapping tables + provider normalizer
- `validate.ts` – extra validations (price ranges, currency rules, links/benefits checks)
- `sample-input.json` – 4–6 representative rows (CO/MX)
- `check.ts` – sanity checks on generated data

Notes
- USD is allowed only when justified by explicit USD markers in the source; otherwise coerced to the country currency (COP/MXN) with a logged reason.
- Prices are converted to monthly when necessary and rounded to two decimals.

