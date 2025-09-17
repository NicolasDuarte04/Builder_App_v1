-- Lightweight KPI Views for Briki telemetry
--
-- Assumptions about raw event storage table:
--   public.events (
--     event        text,          -- Event name (e.g., 'RESULTS_INJECTED')
--     properties   jsonb,         -- Event payload (may contain 'sessionId','userId','durationMs', ...)
--     session_id   text NULL,     -- Optional denormalized session id
--     user_id      text NULL,     -- Optional denormalized user id
--     created_at   timestamptz    -- Event timestamp
--   )
-- If your table name or columns differ, replace occurrences of public.events accordingly.
--
-- Event name matching is done case-insensitively via UPPER(event) to tolerate legacy/lowercase names.

SET search_path = public;

-- ============================================================================
-- v_parse_success_rate
-- Daily success rate for brief parsing: BRIEF_PARSED_SUCCESS ÷ (BRIEF_PARSE_REQUESTED or BRIEF_PARSE_STARTED)
-- Notes:
-- - Denominator prefers REQUESTED when present that day; otherwise falls back to STARTED.
-- - Rate is NULL when denominator is 0.
--
-- Example queries:
--   SELECT * FROM v_parse_success_rate WHERE day >= current_date - 30 ORDER BY day;
--   SELECT round(avg(success_rate)::numeric, 4) AS avg_7d FROM v_parse_success_rate WHERE day >= current_date - 7;
-- ============================================================================
CREATE OR REPLACE VIEW v_parse_success_rate AS
WITH daily AS (
  SELECT
    date_trunc('day', e.created_at) AS day,
    COUNT(*) FILTER (
      WHERE UPPER(e.event) IN ('BRIEF_PARSED_SUCCESS')
    ) AS successes,
    COUNT(*) FILTER (
      WHERE UPPER(e.event) IN ('BRIEF_PARSE_REQUESTED')
    ) AS requested_count,
    COUNT(*) FILTER (
      WHERE UPPER(e.event) IN ('BRIEF_PARSE_STARTED')
    ) AS started_count
  FROM public.events e
  GROUP BY 1
)
SELECT
  day::date AS day,
  successes,
  COALESCE(NULLIF(requested_count, 0), started_count) AS attempts,
  CASE 
    WHEN COALESCE(NULLIF(requested_count, 0), started_count) > 0 
    THEN successes::numeric / COALESCE(NULLIF(requested_count, 0), started_count)
    ELSE NULL
  END AS success_rate
FROM daily
ORDER BY day;

-- =========================================================================
-- v_zero_catalog_rate
-- Daily rate of result injections with zero real catalog plans
-- Definition: RESULTS_INJECTED with properties.hasRealPlans = false
-- Notes:
-- - Uses hasRealPlans to avoid relying on planCount; if missing, row is ignored in numerator
-- - Rate is NULL when denominator is 0
--
-- Example queries:
--   SELECT * FROM v_zero_catalog_rate WHERE day >= current_date - 30 ORDER BY day;
--   SELECT round(avg(zero_catalog_rate)::numeric, 4) FROM v_zero_catalog_rate WHERE day >= current_date - 7;
-- =========================================================================
CREATE OR REPLACE VIEW v_zero_catalog_rate AS
WITH daily AS (
  SELECT
    date_trunc('day', e.created_at) AS day,
    COUNT(*) FILTER (WHERE UPPER(e.event) = 'RESULTS_INJECTED') AS results_injected_count,
    COUNT(*) FILTER (
      WHERE UPPER(e.event) = 'RESULTS_INJECTED'
        AND (e.properties ? 'hasRealPlans')
        AND ((e.properties->>'hasRealPlans')::boolean = false)
    ) AS zero_catalog_count
  FROM public.events e
  GROUP BY 1
)
SELECT
  day::date AS day,
  zero_catalog_count,
  results_injected_count,
  CASE WHEN results_injected_count > 0
       THEN zero_catalog_count::numeric / results_injected_count
       ELSE NULL
  END AS zero_catalog_rate
FROM daily
ORDER BY day;

-- ============================================================================
-- v_no_results_rate
-- Daily rate of searches that resulted in no results shown: NO_RESULTS_SHOWN ÷ RESULTS_INJECTED
-- Notes:
-- - When there are zero RESULTS_INJECTED for a day, rate is NULL.
--
-- Example queries:
--   SELECT * FROM v_no_results_rate WHERE day >= current_date - 30 ORDER BY day;
--   SELECT round(avg(no_results_rate)::numeric, 4) FROM v_no_results_rate WHERE day >= current_date - 7;
-- ============================================================================
CREATE OR REPLACE VIEW v_no_results_rate AS
WITH daily AS (
  SELECT
    date_trunc('day', e.created_at) AS day,
    COUNT(*) FILTER (WHERE UPPER(e.event) = 'RESULTS_INJECTED') AS results_injected_count,
    COUNT(*) FILTER (WHERE UPPER(e.event) = 'NO_RESULTS_SHOWN') AS no_results_count
  FROM public.events e
  GROUP BY 1
)
SELECT
  day::date AS day,
  no_results_count,
  results_injected_count,
  CASE WHEN results_injected_count > 0
       THEN no_results_count::numeric / results_injected_count
       ELSE NULL
  END AS no_results_rate
FROM daily
ORDER BY day;

-- ============================================================================
-- v_compare_cta_rate
-- Daily rate of sessions that add at least one item to comparator: sessions_with_COMPARATOR_ITEM_ADDED ÷ active_sessions
-- Notes:
-- - Session id is taken from events.session_id when present, else from properties->>'sessionId'.
-- - active_sessions = distinct sessions with any event that day.
--
-- Example queries:
--   SELECT * FROM v_compare_cta_rate WHERE day >= current_date - 30 ORDER BY day;
--   SELECT round(avg(compare_cta_rate)::numeric, 4) FROM v_compare_cta_rate WHERE day >= current_date - 7;
-- ============================================================================
CREATE OR REPLACE VIEW v_compare_cta_rate AS
WITH base AS (
  SELECT
    date_trunc('day', e.created_at) AS day,
    COALESCE(NULLIF(e.session_id, ''), NULLIF(e.properties->>'sessionId', '')) AS sid,
    UPPER(e.event) AS evt
  FROM public.events e
), daily AS (
  SELECT
    day,
    COUNT(DISTINCT sid) FILTER (WHERE sid IS NOT NULL) AS sessions,
    COUNT(DISTINCT sid) FILTER (WHERE evt = 'COMPARATOR_ITEM_ADDED' AND sid IS NOT NULL) AS sessions_with_add
  FROM base
  GROUP BY 1
)
SELECT
  day::date AS day,
  sessions_with_add,
  sessions,
  CASE WHEN sessions > 0 THEN sessions_with_add::numeric / sessions ELSE NULL END AS compare_cta_rate
FROM daily
ORDER BY day;

-- ============================================================================
-- v_proposal_ttp_ms
-- Daily percentiles for TIME_TO_PROPOSAL_MS durations (in milliseconds)
-- Notes:
-- - Reads properties.durationMs (fallback: properties.duration or properties.ms) when numeric.
-- - Uses percentile_disc for p50/p95.
--
-- Example queries:
--   SELECT * FROM v_proposal_ttp_ms WHERE day >= current_date - 30 ORDER BY day;
--   -- Latest p50/p95
--   SELECT day, p50_ms, p95_ms FROM v_proposal_ttp_ms ORDER BY day DESC LIMIT 1;
-- ============================================================================
CREATE OR REPLACE VIEW v_proposal_ttp_ms AS
WITH ttp AS (
  SELECT
    date_trunc('day', e.created_at) AS day,
    (
      CASE
        WHEN e.properties ? 'durationMs' AND (e.properties->>'durationMs') ~ '^[0-9]+(\.[0-9]+)?$' THEN (e.properties->>'durationMs')::numeric
        WHEN e.properties ? 'duration'  AND (e.properties->>'duration')  ~ '^[0-9]+(\.[0-9]+)?$' THEN (e.properties->>'duration')::numeric
        WHEN e.properties ? 'ms'        AND (e.properties->>'ms')        ~ '^[0-9]+(\.[0-9]+)?$' THEN (e.properties->>'ms')::numeric
        ELSE NULL
      END
    ) AS duration_ms
  FROM public.events e
  WHERE UPPER(e.event) = 'TIME_TO_PROPOSAL_MS'
)
SELECT
  day::date AS day,
  percentile_disc(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  COUNT(*) FILTER (WHERE duration_ms IS NOT NULL) AS samples
FROM ttp
WHERE duration_ms IS NOT NULL
GROUP BY 1
ORDER BY day;


-- =========================================================================
-- MATERIALIZED DAILY KPI VIEWS (for fast dashboards)
-- =========================================================================
-- These MVs are safe: only aggregated daily rows, no PII.
-- Refresh tip (requires unique index on day):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_parse_success_rate_daily;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zero_catalog_rate_daily;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_proposal_ttp_ms_daily;
-- Or call helper function: SELECT public.refresh_metrics_mviews(true);

-- Parse success rate (daily)
DROP MATERIALIZED VIEW IF EXISTS mv_parse_success_rate_daily;
CREATE MATERIALIZED VIEW mv_parse_success_rate_daily AS
SELECT * FROM v_parse_success_rate;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_parse_success_rate_daily_day
  ON mv_parse_success_rate_daily (day);

-- Zero catalog rate (daily)
DROP MATERIALIZED VIEW IF EXISTS mv_zero_catalog_rate_daily;
CREATE MATERIALIZED VIEW mv_zero_catalog_rate_daily AS
SELECT * FROM v_zero_catalog_rate;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_zero_catalog_rate_daily_day
  ON mv_zero_catalog_rate_daily (day);

-- Time to proposal percentiles (daily)
DROP MATERIALIZED VIEW IF EXISTS mv_proposal_ttp_ms_daily;
CREATE MATERIALIZED VIEW mv_proposal_ttp_ms_daily AS
SELECT * FROM v_proposal_ttp_ms;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_proposal_ttp_ms_daily_day
  ON mv_proposal_ttp_ms_daily (day);

-- Optional convenience rollup view to join KPIs per day (non-materialized)
CREATE OR REPLACE VIEW v_kpi_daily AS
SELECT
  d::date AS day,
  p.success_rate AS parse_success_rate,
  z.zero_catalog_rate,
  t.p50_ms AS time_to_proposal_p50_ms,
  t.p95_ms AS time_to_proposal_p95_ms
FROM (
  SELECT day FROM mv_parse_success_rate_daily
  UNION
  SELECT day FROM mv_zero_catalog_rate_daily
  UNION
  SELECT day FROM mv_proposal_ttp_ms_daily
) days(d)
LEFT JOIN mv_parse_success_rate_daily p USING (day)
LEFT JOIN mv_zero_catalog_rate_daily z USING (day)
LEFT JOIN mv_proposal_ttp_ms_daily t USING (day)
ORDER BY day;

-- Helper to refresh all KPI MVs in one call
CREATE OR REPLACE FUNCTION refresh_metrics_mviews(concurrent boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF concurrent THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_parse_success_rate_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zero_catalog_rate_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_proposal_ttp_ms_daily;
  ELSE
    REFRESH MATERIALIZED VIEW mv_parse_success_rate_daily;
    REFRESH MATERIALIZED VIEW mv_zero_catalog_rate_daily;
    REFRESH MATERIALIZED VIEW mv_proposal_ttp_ms_daily;
  END IF;
END;
$$;

-- ============================================================================
-- v_perf_brief_parse_ms
-- Daily percentiles for withPerfTimer('brief.parse') durations from events
-- Notes:
-- - Reads properties.durationMs/duration_ms when numeric.
-- - Uses percentile_disc for p50/p95.
-- - Event key expected: 'brief.parse'
-- ============================================================================
CREATE OR REPLACE VIEW v_perf_brief_parse_ms AS
WITH src AS (
  SELECT
    date_trunc('day', e.created_at) AS day,
    (
      CASE
        WHEN e.properties ? 'durationMs' AND (e.properties->>'durationMs') ~ '^[0-9]+(\.[0-9]+)?$' THEN (e.properties->>'durationMs')::numeric
        WHEN e.properties ? 'duration_ms' AND (e.properties->>'duration_ms') ~ '^[0-9]+(\.[0-9]+)?$' THEN (e.properties->>'duration_ms')::numeric
        ELSE NULL
      END
    ) AS duration_ms
  FROM public.events e
  WHERE e.event = 'brief.parse'
)
SELECT
  day::date AS day,
  percentile_disc(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  COUNT(*) FILTER (WHERE duration_ms IS NOT NULL) AS samples
FROM src
WHERE duration_ms IS NOT NULL
GROUP BY 1
ORDER BY day;

-- ============================================================================
-- v_perf_proposal_export_ms
-- Daily percentiles for withPerfTimer('proposal.export') durations from events
-- Notes:
-- - Reads properties.durationMs/duration_ms when numeric.
-- - Uses percentile_disc for p50/p95.
-- - Event key expected: 'proposal.export'
-- ============================================================================
CREATE OR REPLACE VIEW v_perf_proposal_export_ms AS
WITH src AS (
  SELECT
    date_trunc('day', e.created_at) AS day,
    (
      CASE
        WHEN e.properties ? 'durationMs' AND (e.properties->>'durationMs') ~ '^[0-9]+(\.[0-9]+)?$' THEN (e.properties->>'durationMs')::numeric
        WHEN e.properties ? 'duration_ms' AND (e.properties->>'duration_ms') ~ '^[0-9]+(\.[0-9]+)?$' THEN (e.properties->>'duration_ms')::numeric
        ELSE NULL
      END
    ) AS duration_ms
  FROM public.events e
  WHERE e.event = 'proposal.export'
)
SELECT
  day::date AS day,
  percentile_disc(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  COUNT(*) FILTER (WHERE duration_ms IS NOT NULL) AS samples
FROM src
WHERE duration_ms IS NOT NULL
GROUP BY 1
ORDER BY day;
