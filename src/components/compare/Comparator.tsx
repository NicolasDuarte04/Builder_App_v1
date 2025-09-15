'use client';

import { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, XCircle, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { ComparedPlan } from '@/types/compare';
import { Brief } from '@/types/brief';
import { computeCriticalDiffs, generateWhyTheseOptions } from '@/lib/comparison/reasoning';
import { normalizeCoverage } from '@/lib/coveragesMap';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { useCompareStore } from '@/state/compareStore';

interface ComparatorProps {
  brief?: Brief | null;
  locale?: 'es' | 'en';
}

const CoverageIcon = ({ status, label }: { status: 'ok' | 'partial' | 'miss'; label: string }) => {
  const icons = {
    ok: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    partial: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    miss: <XCircle className="h-5 w-5 text-gray-300" />,
  };

  return (
    <span role="img" aria-label={label}>
      {icons[status]}
    </span>
  );
};

export function Comparator({ brief, locale = 'es' }: ComparatorProps) {
  const { t, language } = useTranslation();
  // Subscribe only to what we use
  const itemCount = useCompareStore(s => s.items.length);
  // Snapshot of items only when count changes
  const items = useMemo(() => useCompareStore.getState().items, [itemCount]);
  const hasTrackedOpenRef = useRef(false);
  const hasTrackedDiffsRef = useRef(false);
  const hasTrackedReasoningRef = useRef(false);

  // Removed COMPARATOR_OPENED emission here to avoid duplicates; handled by open/scroll triggers.

  if (itemCount < 2) return null;

  // Get critical differences (memoized)
  const criticalDiffs = useMemo(
    () => (brief ? computeCriticalDiffs(items, brief) : []),
    [items, brief]
  );
  
  // Track diffs computed (once)
  useEffect(() => {
    if (criticalDiffs.length > 0 && !hasTrackedDiffsRef.current) {
      hasTrackedDiffsRef.current = true;
      getUserContext().then(({ sessionId, userId }) => {
        telemetry.track(telemetry.events.COMPARATOR_DIFFS_COMPUTED, {
          diffsCount: criticalDiffs.length,
          sessionId,
          userId
        });
      });
    }
  }, [criticalDiffs.length]);

  // Get comparison reasoning (memoized)
  const reasoning = useMemo(
    () => (brief ? generateWhyTheseOptions(items, brief) : ''),
    [items, brief]
  );
  const hasNonCatalogSource = useMemo(
    () => items.some(item => item.source.kind !== 'catalog'),
    [items]
  );
  const disclaimer = hasNonCatalogSource 
    ? ` ${t('disclaimer.sourced')}`
    : '';
  const fullReasoning = reasoning + disclaimer;

  // Track reasoning rendered (once)
  useEffect(() => {
    if (reasoning && !hasTrackedReasoningRef.current) {
      hasTrackedReasoningRef.current = true;
      getUserContext().then(({ sessionId, userId }) => {
        telemetry.track(telemetry.events.COMPARATOR_REASONING_RENDERED, {
          hasDisclaimer: hasNonCatalogSource,
          sessionId,
          userId
        });
      });
    }
  }, [reasoning, hasNonCatalogSource]);

  // Helper to check coverage status
  const getCoverageStatus = (planCoverages: string[], coverage: string): 'ok' | 'partial' | 'miss' => {
    const normalizedCoverage = normalizeCoverage(coverage);
    const normalizedPlanCoverages = planCoverages.map(c => normalizeCoverage(c));
    
    if (normalizedPlanCoverages.includes(normalizedCoverage)) {
      return 'ok';
    }
    
    // Since we don't have optional/unknown flags in current data model,
    // treat all present coverages as 'ok', not 'partial'
    return 'miss';
  };

  // Format source display
  const formatSource = (source: ComparedPlan['source']) => {
    const sourceMap = {
      catalog: t('sources.catalog'),
      template: t('sources.template'),
      pdf: t('sources.pdf'),
      url: t('sources.url'),
      text: t('sources.text'),
    } as const;
    return sourceMap[source.kind] || source.kind;
  };

  // Format date
  const formatDate = (date?: string) => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US');
    } catch {
      return '—';
    }
  };

  // Key coverages to show (from brief or defaults)
  const keyCoverages = brief?.mustHaveCoverages?.slice(0, 3) || ['asistencia', 'robo', 'vidrios'];

  return (
    <section 
      role="region" 
      aria-label={t('header')}
      id="comparison-panel"
      className="w-full rounded-lg border bg-card p-6 mb-4"
      data-testid="comparator"
    >
      <h2 className="text-lg font-semibold mb-4">{t('header')}</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left font-medium p-2 w-40"></th>
              {items.slice(0, 3).map((plan) => (
                <th key={plan.id} className="text-left p-2 min-w-[200px]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{plan.name || 'Plan sin nombre'}</div>
                      {plan.provider && (
                        <div className="text-sm text-muted-foreground">{plan.provider}</div>
                      )}
                    </div>
                    <button
                      onClick={() => useCompareStore.getState().remove(plan.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      aria-label={t('remove')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price */}
            <tr className="border-t">
              <td className="font-medium p-2">{t('price')}</td>
              {items.slice(0, 3).map((plan) => (
                <td key={`${plan.id}-price`} className="p-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold">
                      ${(plan.priceCop || plan.priceEstCop || 0).toLocaleString('es-CO')}
                    </span>
                    {!plan.priceCop && plan.priceEstCop && (
                      <span className="text-sm text-muted-foreground">
                        {t('price_est')}
                      </span>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Deductibles */}
            <tr className="border-t">
              <td className="font-medium p-2">{t('deductibles')}</td>
              {items.slice(0, 3).map((plan) => (
                <td key={`${plan.id}-deductibles`} className="p-2">
                  <span className="text-sm">{plan.deductibles || '—'}</span>
                </td>
              ))}
            </tr>

            {/* Key Coverages */}
            {keyCoverages.map((coverage) => (
              <tr key={coverage} className="border-t">
                <td className="font-medium p-2 capitalize">{t(`coverageTypes.${coverage}`)}</td>
                {items.slice(0, 3).map((plan) => {
                  const status = getCoverageStatus(plan.coverages, coverage);
                  const statusLabels = {
                    ok: `${t(`coverageTypes.${coverage}`)}: ${t('ticks.included')}`,
                    partial: `${t(`coverageTypes.${coverage}`)}: ${t('ticks.partial')}`,
                    miss: `${t(`coverageTypes.${coverage}`)}: ${t('ticks.notIncluded')}`
                  };
                  return (
                    <td key={`${plan.id}-${coverage}`} className="p-2">
                      <CoverageIcon status={status} label={statusLabels[status]} />
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Waiting Times */}
            <tr className="border-t">
              <td className="font-medium p-2">{t('waitingTimes')}</td>
              {items.slice(0, 3).map((plan) => (
                <td key={`${plan.id}-waiting`} className="p-2">
                  <div className="text-sm">
                    {plan.waitingTimes && plan.waitingTimes.length > 0 
                      ? plan.waitingTimes.slice(0, 2).join(', ') + (plan.waitingTimes.length > 2 ? '...' : '')
                      : '—'}
                  </div>
                </td>
              ))}
            </tr>

            {/* Exclusions */}
            <tr className="border-t">
              <td className="font-medium p-2 align-top">{t('exclusions')}</td>
              {items.slice(0, 3).map((plan) => (
                <td key={`${plan.id}-exclusions`} className="p-2">
                  <ul className="text-sm space-y-1">
                    {plan.exclusions && plan.exclusions.length > 0 
                      ? plan.exclusions.slice(0, 3).map((exc, idx) => (
                          <li key={idx} className="truncate" title={exc}>
                            • {exc}
                          </li>
                        ))
                      : <li>—</li>}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Source */}
            <tr className="border-t">
              <td className="font-medium p-2">{t('source')}</td>
              {items.slice(0, 3).map((plan) => (
                <td key={`${plan.id}-source`} className="p-2">
                  <div className="text-sm text-muted-foreground">
                    {formatSource(plan.source)}
                  </div>
                </td>
              ))}
            </tr>

            {/* Last Updated */}
            <tr className="border-t">
              <td className="font-medium p-2">{t('updated')}</td>
              {items.slice(0, 3).map((plan) => (
                <td key={`${plan.id}-updated`} className="p-2">
                  <div className="text-sm text-muted-foreground">
                    {formatDate(plan.source.updatedAt || plan.updatedAt)}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t space-y-4">
        {/* Critical Differences */}
        {criticalDiffs.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">{t('criticalDifferences')}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {criticalDiffs.map((diff: string, idx: number) => (
                <li key={idx}>{diff}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Comparison Reasoning */}
        {fullReasoning && (
          <div>
            <p className="text-sm text-muted-foreground">{fullReasoning}</p>
          </div>
        )}

        {/* Proposal CTA moved to QuickActionBar */}
      </div>
    </section>
  );
}
