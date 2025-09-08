"use client";

import React, { useEffect, useMemo } from 'react';
import { useRightPanelTrigger } from '@/contexts/PlanResultsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ComparisonMessage } from './ComparisonMessage';
import { PlanResultCard } from '@/components/PlanResultCard';
import AnalysisPrepMessage from './messages/AnalysisPrepMessage';

interface MessageRendererProps {
  content: string;
  role?: string;
  name?: string;
  toolInvocations?: any[];
  onAnalyzePlan?: (plan: any) => void;
  onToggleSelect?: (plan: any) => void;
  isSelected?: (planId: string) => boolean;
}

export const MessageRenderer = React.memo(function MessageRenderer({
  content,
  role,
  name,
  toolInvocations,
  onAnalyzePlan,
  onToggleSelect,
  isSelected,
}: MessageRendererProps) {
  const { t } = useTranslation();
  const { showPanelWithPlans, isDualPanelMode } = useRightPanelTrigger();

  const parsed = useMemo(() => {
    const raw = content ?? '';
    try {
      const json = JSON.parse(raw);
      return { isJSON: true as const, payload: json };
    } catch {
      return { isJSON: false as const, payload: null };
    }
  }, [content]);

  // Side-effect hook: runs every render (unconditional)
  useEffect(() => {
    if (!parsed.isJSON) return;
    const p: any = parsed.payload;
    if (p?.type === 'insurance_plans' && Array.isArray(p.plans)) {
      console.log('[MessageRenderer] emitting plan data', p.plans.length);
      showPanelWithPlans({
        title: t('plans.recommendedTitle', { category: p.insuranceType || '' }),
        plans: p.plans,
        category: p.insuranceType,
        query: p.originalQuery,
      });
    }
  }, [parsed, showPanelWithPlans, t]);

  // Determine if this is a blank meaningless message.
  const isBlankText = !parsed.isJSON && !String(content || '').trim();
  if (isBlankText) return null;

  if (isDualPanelMode && parsed.isJSON && parsed.payload?.type === 'insurance_plans' && parsed.payload?.plans?.length > 0) {
    return (
      <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="mt-1">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {t('assistant.plansFound')}
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            {t('assistant.checkRightPanel')}
          </p>
        </div>
      </div>
    );
  }

  if (role === 'tool' && isDualPanelMode) {
    return null;
  }
  
  // Handle portal prep narration
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'portal_prep_narration') {
    const fileName = parsed.payload.fileName || 'document';
    const raw = t('portal.prep.narration') as any;
    const text = typeof raw === 'string' ? raw.replace('{fileName}', fileName) : String(raw);
    return (
      <div className="space-y-2">
        <div className="text-[11px] text-muted-foreground mb-2">
          Briki · Preparando análisis
        </div>
        <div className="rounded-md border bg-card/80 shadow-xs p-3 text-sm text-muted-foreground flex items-start gap-2">
          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span>{text}</span>
        </div>
      </div>
    );
  }
  
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'comparison' && parsed.payload?.plans) {
    return <ComparisonMessage plans={parsed.payload.plans} />;
  }

  // Handle analysis prep
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'analysis_prep') {
    return <AnalysisPrepMessage payload={parsed.payload} />;
  }

  // Handle analysis results
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'analysis_results' && parsed.payload?.analysis) {
    // Trigger right panel with analysis results
    useEffect(() => {
      const lm = (typeof window !== 'undefined' ? (window as any) : null) ? undefined : undefined;
      const layoutMode = (typeof window !== 'undefined' ? (require('@/state/ui') as any).useUI.getState().layoutMode : undefined);
      const isPortalMode = layoutMode === 'analysis_portal_prep' || layoutMode === 'analysis_running' || layoutMode === 'analysis_results';
      if (isDualPanelMode && parsed.payload?.analysis && !isPortalMode) {
        showPanelWithPlans({
          title: 'Análisis de Póliza',
          plans: [], // Empty plans array for analysis
          analysis: parsed.payload.analysis,
          analysisType: 'policy_analysis'
        });
      }
    }, [parsed.payload?.analysis, isDualPanelMode, showPanelWithPlans]);

    return (
      <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start space-x-3">
          <div className="mt-1">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Análisis de póliza completado
            </p>
            <p className="mt-1 text-xs text-green-700 dark:text-green-300">
              Revisa los resultados detallados en el panel derecho
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle custom plan rendering for copilot integration
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'insurance_plans' && !isDualPanelMode) {
    const { plans, message } = parsed.payload;
    return (
      <div className="space-y-3">
        {message && <p className="text-sm mb-3">{message}</p>}
        <div className="space-y-2">
          {plans.map((plan: any) => (
            <PlanResultCard
              key={plan.id}
              plan={plan}
              selected={isSelected?.(plan.id) || false}
              onAnalyze={() => onAnalyzePlan?.(plan)}
              onToggle={() => onToggleSelect?.(plan)}
              compact
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
    </div>
  );
});