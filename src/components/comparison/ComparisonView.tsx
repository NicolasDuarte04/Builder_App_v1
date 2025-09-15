"use client";

import { useEffect, useRef } from "react";
import { useCompareStore } from "@/state/compareStore";
import { useBriefStore } from "@/state/briefStore";
import { useTranslation } from "@/hooks/useTranslation";
import { telemetry, getUserContext } from "@/lib/telemetry";
import { computeCriticalDiffs, generateWhyTheseOptions, tickStatesForMustHaves } from "@/lib/comparison/reasoning";
import { X, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ComparisonView() {
  const items = useCompareStore(s => s.items);
  const remove = useCompareStore(s => s.remove);
  const brief = useBriefStore((state) => state.brief);
  const { t, language } = useTranslation();
  const hasEmittedTelemetryRef = useRef(false);

  // Only render if we have 2+ items
  if (items.length < 2) return null;

  // Emit telemetry on first render with 2+ items
  useEffect(() => {
    if (!hasEmittedTelemetryRef.current && items.length >= 2) {
      hasEmittedTelemetryRef.current = true;
      
      getUserContext().then(({ sessionId, userId }) => {
        // Emit diffs computed
        telemetry.track(telemetry.events.COMPARATOR_DIFFS_COMPUTED, {
          itemCount: items.length,
          sessionId,
          userId
        });
        
        // Emit reasoning rendered
        telemetry.track(telemetry.events.COMPARATOR_REASONING_RENDERED, {
          itemCount: items.length,
          sessionId,
          userId
        });
      });
    }
  }, [items.length]);

  // Get critical differences and reasoning
  const criticalDiffs = computeCriticalDiffs(items, brief || { category: undefined as any, maxBudgetCop: undefined as any, mustHaveCoverages: [] } as any);
  const reasoning = brief ? generateWhyTheseOptions(items, brief) : '';

  // Format price
  const formatPrice = (priceCop?: number | null, priceEstCop?: number | null) => {
    const price = priceCop || priceEstCop;
    const isEstimate = !priceCop && priceEstCop;
    
    if (!price) return t('comparison.fields.noData');
    
    const formatted = new Intl.NumberFormat(language === 'es' ? 'es-CO' : 'en-US', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(price);
    
    return (
      <>
        {formatted}
        {isEstimate && <span className="text-muted-foreground ml-1">{t('comparison.fields.priceEstimated')}</span>}
        <span className="text-sm text-muted-foreground">{t('comparison.fields.perMonth')}</span>
      </>
    );
  };

  // Format source
  const formatSource = (source: { kind: string; ref: string }) => {
    const sourceTypeMap: Record<string, string> = {
      catalog: language === 'es' ? 'Catálogo' : 'Catalog',
      template: language === 'es' ? 'Plantilla' : 'Template',
      pdf: 'PDF',
      url: 'URL',
      text: language === 'es' ? 'Texto' : 'Text'
    };
    
    return sourceTypeMap[source.kind] || source.kind;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t('comparison.fields.noData');
    
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(language === 'es' ? 'es-CO' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="w-full space-y-6">
      <h2 className="text-2xl font-semibold">{t('comparison.title')}</h2>
      
      {/* Responsive grid */}
      <div className={`grid gap-4 ${
        items.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {items.map((plan) => (
          <Card key={plan.id} className="relative p-6 space-y-4">
            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => remove(plan.id)}
              aria-label={t('comparison.removeAriaLabel').replace('{name}', plan.name || plan.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Plan header */}
            <div className="pr-8">
              <h3 className="font-semibold text-lg">{plan.name || plan.id}</h3>
              {plan.provider && (
                <p className="text-sm text-muted-foreground">{plan.provider}</p>
              )}
            </div>
            
            {/* Price row */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t('comparison.fields.price')}</p>
              <p className="text-lg font-semibold">{formatPrice(plan.priceCop, plan.priceEstCop)}</p>
            </div>
            
            {/* Deductibles row */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t('comparison.fields.deductibles')}</p>
              <p className="text-sm">{plan.deductibles || t('comparison.fields.noData')}</p>
            </div>
            
            {/* Coverage ticks */}
            <div className="space-y-2">
              {(['asistencia', 'robo', 'vidrios'] as const).map((coverage) => {
                const states = tickStatesForMustHaves([coverage], plan.coverages);
                const state = states[0];
                const symbol = state === 'ok' ? '✓' : state === 'partial' ? '⚠' : '✗';
                return (
                  <div key={coverage} className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {t(`comparison.fields.${coverage === 'asistencia' ? 'assistance' : coverage === 'robo' ? 'theft' : 'windows'}`)}
                    </span>
                    <span 
                      className={`text-lg ${
                        state === 'ok' ? 'text-green-600' : 
                        state === 'partial' ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}
                      aria-label={state}
                    >
                      {symbol}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Waiting times */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t('comparison.fields.waitingTimes')}</p>
              <p className="text-sm">
                {plan.waitingTimes?.join(', ') || t('comparison.fields.noData')}
              </p>
            </div>
            
            {/* Exclusions with tooltip */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t('comparison.fields.exclusions')}</p>
              {plan.exclusions && plan.exclusions.length > 0 ? (
                <div className="text-sm">
                  <p>{plan.exclusions.slice(0, 3).join(', ')}</p>
                  {plan.exclusions.length > 3 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-primary hover:underline inline-flex items-center gap-1">
                            {t('comparison.tooltip.moreExclusions').replace('{count}', String(plan.exclusions.length - 3))}
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{plan.exclusions.slice(3).join(', ')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ) : (
                <p className="text-sm">{t('comparison.fields.noData')}</p>
              )}
            </div>
            
            {/* Source and last updated */}
            <div className="pt-4 border-t space-y-1 text-xs text-muted-foreground">
              <p>
                {t('comparison.fields.source')}: {formatSource(plan.source)}
              </p>
              <p>
                {t('comparison.fields.lastUpdated')}: {formatDate(plan.updatedAt)}
              </p>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Footer with differences and reasoning */}
      <div className="space-y-4 p-6 bg-muted/50 rounded-lg">
        {/* Critical differences */}
        {criticalDiffs.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">{t('comparison.footer.criticalDifferences')}</h4>
            <ul className="list-disc list-inside space-y-1">
              {criticalDiffs.map((diff: string, index: number) => (
                <li key={index} className="text-sm">{diff}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Reasoning */}
        {reasoning && (
          <div>
            <h4 className="font-semibold mb-2">{t('comparison.footer.whyTheseOptions')}</h4>
            <p className="text-sm">{reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}
