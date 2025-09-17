import { now, since } from '@/lib/time';
import { telemetry } from '@/lib/telemetry';

export type PerfMetricName = 'brief.parse' | 'proposal.export' | (string & {});

export interface PerfTimerOptions {
  budgetMs?: number;
  telemetryProps?: Record<string, any>;
  log?: boolean;
  warn?: boolean;
}

// Centralized perf budgets (ms)
export const PERF_BUDGETS: Record<PerfMetricName, number> = {
  'brief.parse': 1200,
  'proposal.export': 2500,
};

function toIntMs(value: number): number {
  return Math.max(0, Math.round(value));
}

/**
 * Measures async function execution time, logs and emits telemetry with durationMs.
 * - Logs console.warn when duration exceeds budgetMs (if provided).
 * - Emits a telemetry event named by metric with { durationMs, duration_ms, overBudget, budgetMs, ...telemetryProps }.
 */
export async function withPerfTimer<T>(
  metric: PerfMetricName,
  fn: () => Promise<T>,
  options: PerfTimerOptions = {}
): Promise<T> {
  const budgetMs = typeof options.budgetMs === 'number' ? options.budgetMs : PERF_BUDGETS[metric];
  const shouldLog = options.log !== false; // default true
  const shouldWarn = options.warn !== false; // default true

  const t0 = now();
  try {
    const result = await fn();
    return result;
  } finally {
    const durationMs = toIntMs(since(t0));
    const overBudget = typeof budgetMs === 'number' ? durationMs > budgetMs : false;

    // Console log
    if (shouldLog) {
      const msg = `⏱️ [perf] ${metric} → ${durationMs}ms` + (typeof budgetMs === 'number' ? ` (budget ${budgetMs}ms)` : '');
      try {
        if (overBudget && shouldWarn) console.warn(msg);
        else console.log(msg);
      } catch {}
    }

    // Telemetry: include both durationMs and duration_ms for downstream consumers
    try {
      telemetry.track(metric, {
        durationMs,
        duration_ms: durationMs,
        budgetMs,
        overBudget,
        ...(options.telemetryProps || {}),
      });
    } catch {}
  }
}


