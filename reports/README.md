## Thin Results diagnostics

This folder stores diagnostics-only reports for thin search results observed in `/api/plans_v2/search` when logging is enabled.

- What gets logged: events where the API returns 0 or fewer than 3 plans
- Files created per day (UTC):
  - `thin_results_YYYYMMDD.csv`
  - `thin_results_YYYYMMDD.md`
- How to enable: set environment variable `LOG_THIN_RESULTS=true` (default is off)
- Where: files are written under `reports/` in the project root
- How to tail locally:
  - `tail -f reports/thin_results_$(date +%Y%m%d).csv`
  - `sed -n '1,120p' reports/thin_results_$(date +%Y%m%d).md`

Sample dev run:

```bash
LOG_THIN_RESULTS=true BRIKI_DATA_SOURCE=plans_v2_shadow npm run dev
```

Trigger a likely-thin query:

```bash
curl -sS 'http://localhost:3000/api/plans_v2/search?country=CO&includeCategories=educacion&limit=5' | jq '. | {count: length}'
```

Expected CSV header:

```
timestamp,domain,datasource,country,includeCategories,excludeCategories,tags,benefitsContain,count,durationMs,requestId
```


