"use client";

import React, { useEffect, useMemo } from 'react';
import { useRightPanelTrigger } from '@/contexts/PlanResultsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ComparisonMessage } from './ComparisonMessage';

interface MessageRendererProps {
  content: string;
  role?: string;
  name?: string;
  toolInvocations?: any[];
}

export const MessageRenderer = React.memo(function MessageRenderer({
  content,
  role,
  name,
  toolInvocations,
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
  
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'comparison' && parsed.payload?.plans) {
    return <ComparisonMessage plans={parsed.payload.plans} />;
  }

  return (
    <div>
      <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
    </div>
  );
});