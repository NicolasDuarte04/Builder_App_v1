### Analítica de Briki: KPIs y visualización

Este documento describe cómo usar las vistas/materialized views de métricas para construir dashboards en Supabase Studio o Metabase. Las métricas son agregadas por día y no exponen PII.

### KPIs incluidas

- **parse_success_rate**: tasa diaria de éxito del parseo del brief.
- **zero_catalog_rate**: proporción diaria de inyecciones de resultados con 0 planes reales de catálogo.
- **time_to_proposal_p50 / p95**: percentiles diarios de tiempo a propuesta en milisegundos.

### Vistas disponibles (Postgres)

- `v_parse_success_rate(day, successes, attempts, success_rate)`
- `v_zero_catalog_rate(day, zero_catalog_count, results_injected_count, zero_catalog_rate)`
- `v_proposal_ttp_ms(day, p50_ms, p95_ms, samples)`
- `v_kpi_daily(day, parse_success_rate, zero_catalog_rate, time_to_proposal_p50_ms, time_to_proposal_p95_ms)`

Materialized views diarias (rápidas para dashboards):

- `mv_parse_success_rate_daily`
- `mv_zero_catalog_rate_daily`
- `mv_proposal_ttp_ms_daily`

Función de refresh:

```sql
select public.refresh_metrics_mviews(true);
```

### Consulta base (30 días)

```sql
select day,
       parse_success_rate,
       zero_catalog_rate,
       time_to_proposal_p50_ms,
       time_to_proposal_p95_ms
from v_kpi_daily
where day >= current_date - interval '30 days'
order by day;
```

### Supabase Studio: crear dashboard

1) Abrir SQL Editor y ejecutar:

```sql
select public.refresh_metrics_mviews(true);
```

2) Guardar una consulta con la sección “Consulta base (30 días)” y usar “Visualize” para crear:

- **Línea**: `parse_success_rate` (eje Y) vs `day` (eje X).
- **Línea**: `zero_catalog_rate` vs `day`.
- **Líneas múltiples**: `time_to_proposal_p50_ms` y `time_to_proposal_p95_ms` vs `day`.

3) Añadir filtros de rango de fechas con `WHERE day BETWEEN ... AND ...` si se desea.

### Metabase: crear dashboard

1) Conectar la base Postgres (proyecto Supabase) y crear una “Pregunta” SQL con la **Consulta base**.

2) Agregar parámetros:

- `{{start_date}}` y `{{end_date}}` para filtrar `WHERE day BETWEEN {{start_date}} AND {{end_date}}`.

3) Visualizaciones sugeridas: mismas que en Supabase Studio.

4) Programar actualización: llamar periódicamente a `select public.refresh_metrics_mviews(true);` (por ejemplo, vía job externo o tarea programada) antes de renderizar el dashboard.

### Filtros por entorno

- Recomendado: separar entornos por proyecto de Supabase (cada entorno con su DB). Así el “filtro por entorno” es elegir la conexión correspondiente.
- Si se usa una sola DB para múltiples entornos, incluir un campo `env` en `events.properties` al emitir eventos y filtrar con `where (e.properties->>'env') = 'production'`. Si el campo `env` no existe, no es posible filtrar dentro de la misma DB sin cambios en la emisión de eventos.

### Filtros por Feature Flags

Para segmentar KPIs por exposición a un feature flag, puede recrearse la métrica usando eventos crudos unidos a sesiones que vieron el flag.

- Ejemplo: parse_success_rate segmentado por flag `brief_parser_v2`:

```sql
with ff_sessions as (
  select distinct coalesce(nullif(session_id,''), nullif(properties->>'sessionId','')) as sid
  from public.events
  where upper(event) = 'FEATURE_FLAG_EXPOSURE'
    and properties->>'flag' = 'brief_parser_v2'
    and (properties->>'value')::boolean = true
), base as (
  select date_trunc('day', e.created_at)::date as day,
         upper(e.event) as evt,
         coalesce(nullif(e.session_id,''), nullif(e.properties->>'sessionId','')) as sid
  from public.events e
  where coalesce(nullif(e.session_id,''), nullif(e.properties->>'sessionId','')) in (select sid from ff_sessions)
), daily as (
  select day,
         count(*) filter (where evt = 'BRIEF_PARSED_SUCCESS') as successes,
         count(*) filter (where evt = 'BRIEF_PARSE_REQUESTED') as requested_count,
         count(*) filter (where evt = 'BRIEF_PARSE_STARTED') as started_count
  from base
  group by 1
)
select day,
       successes,
       coalesce(nullif(requested_count,0), started_count) as attempts,
       case when coalesce(nullif(requested_count,0), started_count) > 0
            then successes::numeric / coalesce(nullif(requested_count,0), started_count)
            else null end as parse_success_rate
from daily
order by day;
```

- Ejemplo: zero_catalog_rate segmentado por flag:

```sql
with ff_sessions as (
  select distinct coalesce(nullif(session_id,''), nullif(properties->>'sessionId','')) as sid
  from public.events
  where upper(event) = 'FEATURE_FLAG_EXPOSURE'
    and properties->>'flag' = 'brief_parser_v2'
    and (properties->>'value')::boolean = true
), base as (
  select date_trunc('day', e.created_at)::date as day,
         upper(e.event) as evt,
         coalesce(nullif(e.session_id,''), nullif(e.properties->>'sessionId','')) as sid,
         (e.properties->>'hasRealPlans')::boolean as has_real_plans
  from public.events e
  where coalesce(nullif(e.session_id,''), nullif(e.properties->>'sessionId','')) in (select sid from ff_sessions)
)
, daily as (
  select day,
         count(*) filter (where evt='RESULTS_INJECTED') as results_injected_count,
         count(*) filter (where evt='RESULTS_INJECTED' and has_real_plans = false) as zero_catalog_count
  from base
  group by 1
)
select day,
       zero_catalog_count,
       results_injected_count,
       case when results_injected_count>0 then zero_catalog_count::numeric/results_injected_count else null end as zero_catalog_rate
from daily
order by day;
```

- Ejemplo: time_to_proposal percentiles segmentado por flag:

```sql
with ff_sessions as (
  select distinct coalesce(nullif(session_id,''), nullif(properties->>'sessionId','')) as sid
  from public.events
  where upper(event) = 'FEATURE_FLAG_EXPOSURE'
    and properties->>'flag' = 'brief_parser_v2'
    and (properties->>'value')::boolean = true
), ttp as (
  select date_trunc('day', e.created_at)::date as day,
         (
           case
             when e.properties ? 'durationMs' and (e.properties->>'durationMs') ~ '^[0-9]+(\.[0-9]+)?$' then (e.properties->>'durationMs')::numeric
             when e.properties ? 'duration'  and (e.properties->>'duration')  ~ '^[0-9]+(\.[0-9]+)?$' then (e.properties->>'duration')::numeric
             when e.properties ? 'ms'        and (e.properties->>'ms')        ~ '^[0-9]+(\.[0-9]+)?$' then (e.properties->>'ms')::numeric
             else null
           end
         ) as duration_ms
  from public.events e
  where upper(e.event) = 'TIME_TO_PROPOSAL_MS'
    and coalesce(nullif(e.session_id,''), nullif(e.properties->>'sessionId','')) in (select sid from ff_sessions)
)
select day,
       percentile_disc(0.50) within group (order by duration_ms) as p50_ms,
       percentile_disc(0.95) within group (order by duration_ms) as p95_ms
from ttp
where duration_ms is not null
group by 1
order by day;
```

### Privacidad (sin PII)

- Las vistas publicadas solo contienen agregados por `day`.
- Evitar seleccionar `user_id`, `session_id` o `properties` en dashboards.
- Para segmentaciones avanzadas, trabajar con IDs hash y agregados, no con datos de usuario.


