# Perf Budgets y Instrumentación

Este documento define los presupuestos de rendimiento (performance budgets) y cómo instrumentar funciones críticas con `withPerfTimer`.

## Utilidad

- Archivo: `src/lib/perf.ts`
- API: `withPerfTimer(metric, asyncFn, options)`
- Telemetría emitida: evento con nombre `metric` y propiedades `{ durationMs, duration_ms, budgetMs, overBudget, ... }`.
- Consola: log de tiempo y `console.warn` si supera el presupuesto.

## Presupuestos (ms)

- `brief.parse`: 1200 ms
- `proposal.export`: 2500 ms

Puedes ajustar `PERF_BUDGETS` en `src/lib/perf.ts` o pasar `budgetMs` en `options` por llamada.

## Uso

```ts
import { withPerfTimer } from '@/lib/perf';

const result = await withPerfTimer('brief.parse', () => parseBriefFromText(text, locale), {
  telemetryProps: { source: 'text', chars: text.length },
});
```

## Vistas de métricas (p50/p95)

Archivo: `supabase/sql/views/metrics.sql`
- `v_perf_brief_parse_ms`: percentiles p50/p95 diarios para `brief.parse`.
- `v_perf_proposal_export_ms`: percentiles p50/p95 diarios para `proposal.export`.
- `v_proposal_ttp_ms`: percentiles p50/p95 del `TIME_TO_PROPOSAL_MS` existente.

Ejemplos:
```sql
SELECT day, p50_ms, p95_ms FROM v_perf_brief_parse_ms ORDER BY day DESC LIMIT 7;
SELECT day, p50_ms, p95_ms FROM v_perf_proposal_export_ms ORDER BY day DESC LIMIT 7;
```

## Alertas en consola

- Si `durationMs` > `budgetMs`, se emite `console.warn` con el nombre de la métrica y el presupuesto.
- Para desactivar logs: `withPerfTimer(name, fn, { log: false })`.


