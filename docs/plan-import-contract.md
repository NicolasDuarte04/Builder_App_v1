# Plan Import CSV Contract

This document defines the single, strict CSV schema for staging new plans before any database write.

Columns (exact order):

product,country,carrier_name,plan_name,variant,currency,premium_amount_month,coverage_json,limits_json,deductibles_json,tags,source_url,notes

Rules:

- product: one of ["auto","health","home","travel","life","pet","dental"]
- country: ISO country code we support (e.g., "MX","CO","CL","PE","AR","US")
- carrier_name: string, normalized brand (e.g., "MAPFRE","SURA")
- plan_name: string
- variant: string or empty (e.g., "Plus","Basic"); treat empty as "standard"
- currency: ISO (MXN, COP, CLP, PEN, ARS, USD)
- premium_amount_month: number (>0), monthly value; if only annual data available, convert to monthly and mention basis in notes
- coverage_json|limits_json|deductibles_json: valid JSON object strings, flat key/value; example: {"medical":"USD 50k","hospital":"Included"}
- tags: comma-separated (e.g., "auto,young-driver")
- source_url: https URL to public source
- notes: free text, may be empty

Notes:

- The validator enforces column order and value constraints and produces a JSON report under `data/audit/validate_report.json`.
- Staging and upsert are disabled by default; dry-run comparison produces `data/audit/dryrun_diff.json` without any database writes.


