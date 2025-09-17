## Step 15 — Canonical Rollout Plan (Preview → Production)

### Goals
- **De-risk launch**: progressive exposure with clear kill-switches.
- **Maintain UX quality**: fast proposal generation, low error/no-results rates.
- **Observe & learn**: measure KPIs and iterate before 100% rollout.

### Scope
- Assistant search + parsing + proposal generation pipeline (plans_v2/templates).
- UI elements behind flags: portal, PDF verify, trust metadata, OCR fallback, templates fallback, homepage layout v2, currency normalization.
- Telemetry guardrails and success metrics.

### Owners
- **Engineering (DRI)**: Nicolás Duarte
- **Product**: TBD
- **Design**: TBD
- **QA**: TBD
- **Data/Telemetry**: TBD

---

## Per-sprint exits (gates)

### Sprint P (Preview only)
- Traffic: internal + invited users only.
- Gates:
  - parse_success_rate ≥ 80%
  - no_results_rate ≤ 25%
  - proposal_ttp_ms p50 ≤ 2200 ms; p95 ≤ 6000 ms
  - errors_per_1k ≤ 20
  - compare_cta_rate ≥ 25%

### Sprint 1 (10–25% Production)
- Expand to 10–25% of production traffic.
- Gates:
  - parse_success_rate ≥ 85%
  - no_results_rate ≤ 20%
  - proposal_ttp_ms p50 ≤ 2000 ms; p95 ≤ 5000 ms
  - errors_per_1k ≤ 15
  - compare_cta_rate ≥ 30%

### Sprint 2 (50–100% Production)
- Roll to 50%, then 100% if stable for ≥72h.
- Gates:
  - parse_success_rate ≥ 88%
  - no_results_rate ≤ 18%
  - proposal_ttp_ms p50 ≤ 1800 ms; p95 ≤ 4500 ms
  - errors_per_1k ≤ 12
  - compare_cta_rate ≥ 32%

Notes: Targets are initial; adjust with real baselines from Preview.

---

## Flags matrix (Preview vs Prod)

Legend: On = enabled by default; Off = disabled by default; A/B = assignment function; Env = toggle via env + redeploy.

| Area | Flag (code) | Env / Key | Preview | Prod | Owner | Notes |
|---|---|---|---|---|---|---|
| Portal | `ENABLE_BRC_PORTAL` | `NEXT_PUBLIC_BRC_PORTAL_ENABLED` | On | Off | Eng | Hard on/off. |
| Portal | `DEBUG_PORTAL` | `NEXT_PUBLIC_DEBUG_PORTAL` | On | Off | Eng | Debug logging/UI. |
| PDF | `ENABLE_PDF_VERIFY` | `NEXT_PUBLIC_ENABLE_PDF_VERIFY` | On | Off | Eng | Dual-pane verify UI. |
| PDF | `PDF_THUMBS_ENABLED` | `NEXT_PUBLIC_PDF_THUMBS` | On | Off | Eng | Avoid native module issues on Prod. |
| Save | `ENABLE_SAVE_POLICY` | — | On | Off | Eng | UI-only; safe to disable. |
| Insurance | `ENABLE_INSURANCE_PORTAL` | — | On | Off | Eng | UI-only; safe to disable. |
| Home | `HOMEPAGE_LAYOUT_V2` | `NEXT_PUBLIC_HOMEPAGE_LAYOUT_V2` | On | Off | Product | Client flag (`lib/flags.ts`). |
| OCR | `FF_OCR_FALLBACK` | `NEXT_PUBLIC_FF_OCR_FALLBACK` | On (A/B 50%) | Off | Eng | `assignOcrFallback` controls 50%. |
| Brief | `FF_INCREDIBLE_BRIEF` | `NEXT_PUBLIC_FF_INCREDIBLE_BRIEF` | On (A/B 30%) | On (A/B 30%) | Product | `assignIncredibleBrief`. |
| Input | `FF_LONG_PASTE_GUARD` | `NEXT_PUBLIC_FF_LONG_PASTE_GUARD` | On (A/B 20%) | On (A/B 20%) | Eng | Guard large pastes. |
| Currency | `CURRENCY_NORM` | `NEXT_PUBLIC_FF_CURRENCY_NORM` | On | Off | Product | Normalize currency in UI. |
| Trust | `TRUST_METADATA` | `NEXT_PUBLIC_ENABLE_TRUST_METADATA` | On | Off | Product | Surfaces plan source/updatedAt. |
| Fallback | `TEMPLATES_FALLBACK` | `NEXT_PUBLIC_ENABLE_TEMPLATES_FALLBACK` | On | On | Product | Reduce no-results. |
| UX Notice | `NO_RESULTS_CHAT_NOTICE` | `NEXT_PUBLIC_ENABLE_NO_RESULTS_CHAT_NOTICE` | On | On | Product | Coach users on empty states. |

References:
- Server/client flags: `src/lib/featureFlags.ts`
- Public flags system: `src/lib/flags.ts` (env `NEXT_PUBLIC_*` + localStorage)

---

## Test checklists

### Automated
- Unit tests
```bash
pnpm test:unit
```
- E2E (core)
```bash
pnpm test:e2e
```
- E2E (edge cases)
```bash
pnpm test:e2e:edge
```
- Diagnostics coverage (sanity)
```bash
pnpm diagnostics:coverage
```
- Playwright report: `briki-clean/playwright-report/index.html`

### Manual acceptance (Preview)
- Upload PDF → analysis completes; no console errors; PDF verify UI gated by `ENABLE_PDF_VERIFY`.
- Search with and without budget → templates fallback triggers when no catalog results.
- Trust metadata visible when `TRUST_METADATA` is On; hidden when Off.
- OCR fallback variant assigned (50%) and exposure tracked.
- Proposal generation returns URL; open/copy works; time-to-proposal within budget.

### Non-functional
- p95 proposal time within gate; no CPU spikes; memory stable.
- Error boundaries render friendly states; no uncaught exceptions.

---

## Telemetry KPIs

Source: `src/lib/telemetry.ts` events. Dashboards are placeholders and should be wired to your analytics backend.

| KPI | Definition | Target (Sprint P / 1 / 2) | Dashboard |
|---|---|---|---|
| parse_success_rate | `BRIEF_PARSED_SUCCESS` ÷ (`BRIEF_PARSE_REQUESTED` or `BRIEF_PARSE_STARTED`) | 80% / 85% / 88% | [Parse Success](https://dash.example.com/rollout/parse-success) |
| no_results_rate | `NO_RESULTS_SHOWN` ÷ `PLANS_SEARCHED` | ≤25% / ≤20% / ≤18% | [No Results](https://dash.example.com/rollout/no-results) |
| compare_cta_rate | `compare_cta_clicked` ÷ sessions with results (`RESULTS_DRAWN`) | ≥25% / ≥30% / ≥32% | [Compare CTA](https://dash.example.com/rollout/compare-cta) |
| proposal_ttp_ms | Median/percentiles from `TIME_TO_PROPOSAL_MS` or `PROPOSAL_GENERATION_COMPLETED.durationMs` | p50 ≤ 2200/2000/1800; p95 ≤ 6000/5000/4500 | [TTP](https://dash.example.com/rollout/ttp) |
| errors_per_1k | Error events (`*_FAILED`, `PDF_ANALYSIS_FAILED`, `ANALYZER_RUN_FAILED`, `PARSING_FAILED`) per 1000 sessions | ≤20 / ≤15 / ≤12 | [Errors](https://dash.example.com/rollout/errors) |

Implementation notes:
- Use `telemetry.track('FEATURE_FLAG_EXPOSURE', { flag, value, sessionId })` when resolving key flags.
- Guard payloads via telemetry sanitizer. Prefer integer ms fields: `durationMs`, `latencyMs`.

---

## Rollback switches (kill switches)

Immediate (config + redeploy if env-var based):
- Membership limiter: set `MEMBERSHIP_ENFORCEMENT=off` (ref: `PRODUCTION_CHECKLIST.md`).
- Portal: `NEXT_PUBLIC_BRC_PORTAL_ENABLED=false`.
- PDF verify UI: `NEXT_PUBLIC_ENABLE_PDF_VERIFY=false`.
- Trust metadata: `NEXT_PUBLIC_ENABLE_TRUST_METADATA=false`.
- OCR fallback: `NEXT_PUBLIC_FF_OCR_FALLBACK=false`.
- Templates fallback: `NEXT_PUBLIC_ENABLE_TEMPLATES_FALLBACK=false` (expect higher no-results).
- Currency normalization: `NEXT_PUBLIC_FF_CURRENCY_NORM=false`.
- Debug mode: `NEXT_PUBLIC_DEBUG_PORTAL=false`.
- PDF thumbnails: `NEXT_PUBLIC_PDF_THUMBS=off`.

Operational:
- Revert to previous deploy on Vercel.
- Disable feature at CDN/edge if applicable.

---

## Links
- Tests (commands above) and local report: `briki-clean/playwright-report/index.html`
- Dashboards (placeholders):
  - [Rollout KPIs](https://dash.example.com/rollout/kpis)
  - [Errors & Alerts](https://dash.example.com/rollout/errors)
  - [Performance](https://dash.example.com/rollout/perf)
- Related docs: `PRODUCTION_CHECKLIST.md`, `PRODUCTION_QA_CHECKLIST.md`

---

## Change log / approvals
- Date: YYYY-MM-DD — Created
- Eng (DRI): —
- Product: —
- QA: —

