import { notFound } from 'next/navigation';

const ENABLED = String(process.env.NEXT_PUBLIC_ENABLE_ADMIN_METRICS || '').toLowerCase() === 'true';

export default function MetricsPage() {
  if (!ENABLED) return notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Métricas (KPI)</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Panel informativo (sin datos directos). Usa las vistas agregadas para graficar en Supabase Studio o Metabase.
      </p>

      <div className="mt-6 space-y-6">
        <section>
          <h2 className="text-base font-medium">Vistas y Materialized Views</h2>
          <ul className="list-disc pl-5 text-sm mt-2">
            <li><code>v_parse_success_rate</code>, <code>mv_parse_success_rate_daily</code></li>
            <li><code>v_zero_catalog_rate</code>, <code>mv_zero_catalog_rate_daily</code></li>
            <li><code>v_proposal_ttp_ms</code>, <code>mv_proposal_ttp_ms_daily</code></li>
            <li><code>v_kpi_daily</code> (rollup)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-medium">Refresh</h2>
          <pre className="text-xs bg-muted/40 rounded p-3 overflow-x-auto">
{`select public.refresh_metrics_mviews(true);`}
          </pre>
        </section>

        <section>
          <h2 className="text-base font-medium">Consulta base (30 días)</h2>
          <pre className="text-xs bg-muted/40 rounded p-3 overflow-x-auto">
{`select day,
       parse_success_rate,
       zero_catalog_rate,
       time_to_proposal_p50_ms,
       time_to_proposal_p95_ms
from v_kpi_daily
where day >= current_date - interval '30 days'
order by day;`}
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            Ver guía completa en <code>docs/analytics.md</code>.
          </p>
        </section>
      </div>
    </div>
  );
}


