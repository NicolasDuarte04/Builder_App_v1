"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertTriangle, Info, ArrowLeftRight } from 'lucide-react';
import type { TemplatePlan } from '@/types/results';
import { formatCurrency, formatTrustDate } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { FLAGS } from '@/lib/flags';
import { useCompareStore } from '@/state/compareStore';
import { fromTemplate } from '@/lib/comparison/adapters';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { Brief } from '@/types/brief';
import { makeLabelResolver } from '@/lib/i18n/labels';

interface TemplatePlanCardProps {
  template: TemplatePlan;
  onUseTemplate?: (template: TemplatePlan) => void;
  isCompact?: boolean;
  brief?: Brief;
}

export function TemplatePlanCard({ template, onUseTemplate, isCompact = false, brief }: TemplatePlanCardProps) {
  const { t, language } = useTranslation();
  const { fieldLabel, enumLabel } = makeLabelResolver(((key: string, opts?: any) => {
    const val = t(key as any);
    return (val === (key as any) && opts?.fallback !== undefined) ? opts.fallback : val;
  }) as any);
  const compareCount = useCompareStore(s => s.count);
  const isInComparison = useCompareStore(s => s.isInCompare(String(template.id)));
  const isComparisonFull = useCompareStore(s => s.isFull);
  const add = useCompareStore(s => s.add);
  const remove = useCompareStore(s => s.remove);
  
  const handleUseTemplate = () => {
    if (onUseTemplate) {
      onUseTemplate(template);
    }
  };

  

  const handleCompareToggle = () => {
    const nextPressed = !isInComparison;
    console.debug('[audit][template-compare]', { pressed: nextPressed, id: String(template.id) });
    if (isInComparison) {
      remove(String(template.id));
    } else if (!isComparisonFull) {
      const comparedPlan = fromTemplate(template, brief);
      add(comparedPlan);
    }
  };

  return (
    <Card className="h-full border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
      <CardHeader className={isCompact ? "pb-2" : "pb-3"}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className={isCompact ? "font-semibold text-gray-900 dark:text-gray-100 text-sm" : "font-semibold text-gray-900 dark:text-gray-100 text-base"}>
              {template.title}
            </CardTitle>
            <Badge 
              variant="secondary" 
              className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex-shrink-0"
            >
              {template.fitScore}% fit
            </Badge>
          </div>
          <Button
            size="sm"
            variant={isInComparison ? "secondary" : "outline"}
            onClick={handleCompareToggle}
            disabled={!isInComparison && isComparisonFull}
            className="flex-shrink-0 h-8 px-2 gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            data-testid="compare-toggle"
            aria-label={isInComparison ? String((t as any)('comparison.inComparison') || 'En comparación') : String((t as any)('comparison.add') || 'Agregar a comparación')}
            aria-pressed={isInComparison}
            title={isInComparison ? String((t as any)('comparison.inComparison') || 'En comparación') : String((t as any)('comparison.add') || 'Agregar a comparación')}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="text-xs">{compareCount}/3</span>
          </Button>
        </div>
        {!isCompact && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {template.summary}
          </p>
        )}
      </CardHeader>
      
      <CardContent className={isCompact ? "space-y-3" : "space-y-4"}>
        {/* Trust metadata */}
        {template.source?.kind && template.source?.updatedAt && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400" data-testid="plan-trust-meta">
            {String(t('assistant.trust.source'))}: {enumLabel('sources', String(template.source.kind))} • {String(t('assistant.trust.updated'))}: {formatTrustDate(template.source.updatedAt, language)}
          </div>
        )}
        {/* Price Range */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className={isCompact ? "font-medium text-gray-700 dark:text-gray-300 mb-1 text-xs" : "font-medium text-gray-700 dark:text-gray-300 mb-1 text-sm"}>
            Rango de precio estimado
          </div>
          <div className={isCompact ? "font-bold text-gray-900 dark:text-gray-100 text-base" : "font-bold text-gray-900 dark:text-gray-100 text-lg"}>
            {formatCurrency(template.priceRangeCop.min)} - {formatCurrency(template.priceRangeCop.max)}
          </div>
        </div>

        {/* Suggested Coverages */}
        {template.suggestedCoverages.length > 0 && (
          <div>
            <div className={isCompact ? "font-medium text-gray-700 dark:text-gray-300 mb-2 text-xs" : "font-medium text-gray-700 dark:text-gray-300 mb-2 text-sm"}>
              Coberturas incluidas
            </div>
            <div className="flex flex-wrap gap-1">
              {template.suggestedCoverages.slice(0, isCompact ? 3 : 4).map((coverage, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {enumLabel('coverage_types', String(coverage))}
                </Badge>
              ))}
              {template.suggestedCoverages.length > (isCompact ? 3 : 4) && (
                <Badge variant="outline" className="text-xs text-gray-500">
                  +{template.suggestedCoverages.length - (isCompact ? 3 : 4)} más
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Red Flags */}
        {!isCompact && template.redFlags.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="flex items-center text-red-700 dark:text-red-400 text-sm font-medium mb-1">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Consideraciones
            </div>
            <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
              {template.redFlags.map((flag, index) => (
                <li key={index}>• {flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimers */}
        {template.disclaimers.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className={isCompact ? "flex items-center text-blue-700 dark:text-blue-400 font-medium mb-1 text-xs" : "flex items-center text-blue-700 dark:text-blue-400 font-medium mb-1 text-sm"}>
              <Info className="w-4 h-4 mr-1" />
              Información importante
            </div>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              {template.disclaimers.slice(0, isCompact ? 1 : 2).map((disclaimer, index) => (
                <li key={index}>• {disclaimer}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Compare toggle near CTA */}
        <div className="flex w-full justify-end">
          <Button
            size={isCompact ? "sm" : "default"}
            variant={isInComparison ? "secondary" : "outline"}
            onClick={handleCompareToggle}
            disabled={!isInComparison && isComparisonFull}
            className="h-9 px-3 gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            data-testid="template-compare-toggle"
            aria-label={isInComparison ? String((t as any)('comparison.inComparison') || 'En comparación') : String((t as any)('comparison.add') || 'Agregar a comparación')}
            aria-pressed={isInComparison}
            title={isInComparison ? String((t as any)('comparison.inComparison') || 'En comparación') : String((t as any)('comparison.add') || 'Agregar a comparación')}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="text-xs">{compareCount}/3</span>
          </Button>
        </div>

        {/* Action Button */}
        <Button 
          onClick={handleUseTemplate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size={isCompact ? "sm" : "default"}
        >
          Usar esta plantilla
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
