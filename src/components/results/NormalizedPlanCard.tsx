"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Link, AlertCircle, Star, ArrowLeftRight } from 'lucide-react';
import type { NormalizedPlan } from '@/types/results';
import { formatCurrency, formatTrustDate } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { useCompareStore } from '@/state/compareStore';
import { fromSource } from '@/lib/comparison/adapters';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { Brief } from '@/types/brief';
import { SourceKind } from '@/types/compare';
import { FLAGS } from '@/lib/flags';

interface NormalizedPlanCardProps {
  plan: NormalizedPlan & { fitScore?: number };
  onViewSource?: (source: NormalizedPlan['source']) => void;
  onAnalyze?: (plan: NormalizedPlan) => void;
  isCompact?: boolean;
  brief?: Brief;
}

export function NormalizedPlanCard({ 
  plan, 
  onViewSource, 
  onAnalyze, 
  isCompact = false,
  brief 
}: NormalizedPlanCardProps) {
  const { t, language } = useTranslation();
  const planId = `${plan.source.kind}-${plan.source.ref}`;
  const compareCount = useCompareStore(s => s.count);
  const isInComparison = useCompareStore(s => s.isInCompare(planId));
  const isComparisonFull = useCompareStore(s => s.isFull);
  const add = useCompareStore(s => s.add);
  const remove = useCompareStore(s => s.remove);
  

  const handleCompareToggle = () => {
    if (isInComparison) {
      remove(planId);
      return;
    }
    if (!isComparisonFull) {
      const comparedPlan = fromSource(plan, plan.source.kind as Exclude<SourceKind, 'catalog' | 'template'>, brief);
      add(comparedPlan);
    }
  };

  const getSourceIcon = (sourceKind: string) => {
    switch (sourceKind) {
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'url':
        return <Link className="w-4 h-4" />;
      case 'text':
        return <FileText className="w-4 h-4" />;
      default:
        return <ExternalLink className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (sourceKind: string) => {
    switch (sourceKind) {
      case 'pdf':
        return 'PDF';
      case 'url':
        return 'Web';
      case 'text':
        return 'Texto';
      default:
        return 'Fuente';
    }
  };

  return (
    <Card className="h-full border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors">
      <CardHeader className={isCompact ? "pb-2" : "pb-3"}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className={`font-semibold text-gray-900 dark:text-gray-100 ${isCompact ? "text-sm" : "text-base"} truncate`}>
              {plan.name || 'Plan normalizado'}
            </CardTitle>
            {plan.provider && (
              <p className={`text-gray-600 dark:text-gray-400 ${isCompact ? "text-xs" : "text-sm"} truncate`}>
                {plan.provider}
              </p>
            )}
            {FLAGS.trustMetadata && plan.source?.kind && plan.source?.updatedAt && (
              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400" data-testid="plan-trust-meta">
                {String(t('assistant.trust.source'))}: {plan.source.kind} • {String(t('assistant.trust.updated'))}: {formatTrustDate(plan.source.updatedAt, language)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              variant={isInComparison ? "secondary" : "outline"} 
              size="sm" 
              onClick={handleCompareToggle}
              disabled={!isInComparison && isComparisonFull}
              className="h-8 px-2 gap-1"
              data-testid="compare-toggle"
              aria-label={isInComparison ? String((t as any)('comparison.inComparison') || 'En comparación') : String((t as any)('comparison.add') || 'Agregar a comparación')}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span className="text-xs">{compareCount}/3</span>
            </Button>
            {plan.fitScore !== undefined && (
              <Badge 
                variant="secondary" 
                className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                <Star className="w-3 h-3 mr-1" />
                {plan.fitScore}%
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className="text-xs flex items-center gap-1"
            >
              {getSourceIcon(plan.source.kind)}
              {getSourceLabel(plan.source.kind)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={`space-y-${isCompact ? "3" : "4"}`}>
        {/* Price */}
        {plan.priceCop && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className={`font-medium text-green-700 dark:text-green-300 mb-1 ${isCompact ? "text-xs" : "text-sm"}`}>
              Precio estimado
            </div>
            <div className={`font-bold text-green-900 dark:text-green-100 ${isCompact ? "text-base" : "text-lg"}`}>
              {formatCurrency(plan.priceCop)}
            </div>
          </div>
        )}

        {/* Benefits */}
        {plan.benefits.length > 0 && (
          <div>
            <div className={`font-medium text-gray-700 dark:text-gray-300 mb-2 ${isCompact ? "text-xs" : "text-sm"}`}>
              Beneficios identificados
            </div>
            <div className="flex flex-wrap gap-1">
              {plan.benefits.slice(0, isCompact ? 3 : 5).map((benefit, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {benefit}
                </Badge>
              ))}
              {plan.benefits.length > (isCompact ? 3 : 5) && (
                <Badge variant="outline" className="text-xs text-gray-500">
                  +{plan.benefits.length - (isCompact ? 3 : 5)} más
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Exclusions */}
        {!isCompact && plan.exclusions && plan.exclusions.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <div className="flex items-center text-amber-700 dark:text-amber-400 text-sm font-medium mb-1">
              <AlertCircle className="w-4 h-4 mr-1" />
              Exclusiones identificadas
            </div>
            <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
              {plan.exclusions.slice(0, 2).map((exclusion, index) => (
                <li key={index}>• {exclusion}</li>
              ))}
              {plan.exclusions.length > 2 && (
                <li className="text-gray-500">• +{plan.exclusions.length - 2} más...</li>
              )}
            </ul>
          </div>
        )}

        {/* Source Reference */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className={`font-medium text-gray-700 dark:text-gray-300 mb-1 ${isCompact ? "text-xs" : "text-sm"}`}>
            Fuente de datos
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
              {plan.source.ref}
            </span>
            {onViewSource && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewSource(plan.source)}
                className="text-xs h-6 px-2"
              >
                Ver fuente
              </Button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onAnalyze && (
            <Button 
              variant="outline"
              onClick={() => onAnalyze(plan)}
              size={isCompact ? "sm" : "default"}
              className="flex-1"
            >
              Analizar
            </Button>
          )}
          <Button 
            variant="default"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            size={isCompact ? "sm" : "default"}
          >
            Usar plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
