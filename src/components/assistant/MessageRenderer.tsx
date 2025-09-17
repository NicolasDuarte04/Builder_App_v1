"use client";

import React, { useEffect, useMemo } from 'react';
import { telemetry } from '@/lib/telemetry';
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
  lastPolicyContext?: any;
}

export const MessageRenderer = React.memo(function MessageRenderer({
  content,
  role,
  name,
  toolInvocations,
  onAnalyzePlan,
  onToggleSelect,
  isSelected,
  lastPolicyContext,
}: MessageRendererProps) {
  const { t } = useTranslation();
  const { showPanelWithPlans, isDualPanelMode } = useRightPanelTrigger();

  // Debug: confirm we're on the right file (avoid import.meta to silence Next warning)
  console.info('[MR] mount', { role, len: (content || '').length });

  // Defense in depth: hide policy context messages
  if (name === 'policy_section_context') {
    return null;
  }

  // --- parse content robustly ---
  function parseMaybeJSON(raw: string): { json: any; source: 'json' | 'fenced' | null } {
    // Try strict JSON
    try { return { json: JSON.parse(raw), source: 'json' as any }; } catch {}
    // Try fenced JSON at the end of the message
    const m = raw.match(/```(?:json)?\s*\n([\s\S]*?)\s*```/);
    if (m && m[1]) {
      try { return { json: JSON.parse(m[1]), source: 'fenced' as any }; } catch {}
    }
    return { json: null, source: null as any };
  }

  const parsed = useMemo(() => {
    const { json, source } = parseMaybeJSON(content || '');
    return { isJSON: !!json, payload: json, source };
  }, [content]);

  // Debug: log parsing result
  console.info('[MR] parsed', { isJSON: !!parsed.isJSON, type: parsed.payload?.type, source: parsed.source });

  // Side-effect hook: runs every render (unconditional)
  useEffect(() => {
    if (!parsed.isJSON) return;
    const p: any = parsed.payload;
    
    // Handle insurance plans
    if (p?.type === 'insurance_plans' && Array.isArray(p.plans)) {
      console.log('[MessageRenderer] emitting plan data', p.plans.length);
      showPanelWithPlans({
        title: (t as any)('plans.recommendedTitle', { category: p.insuranceType || '' }),
        plans: p.plans,
        category: p.insuranceType,
        query: p.originalQuery,
      });
    }
    
    // Handle templates
    if (p?.type === 'templates' && Array.isArray(p.items) && isDualPanelMode) {
      console.log('[MessageRenderer] emitting template data', p.items.length);
      showPanelWithPlans({
        title: p.title || 'Plantillas Sugeridas',
        plans: [], // No plans for templates
        templates: p.items,
        category: p.insuranceType,
        query: p.originalQuery,
        hasRealPlans: false,
        isExactMatch: p.isExactMatch,
        noExactMatchesFound: p.noExactMatchesFound,
        dataSource: p.dataSource
      });
    }
  }, [parsed, showPanelWithPlans, isDualPanelMode, t]);

  // Side-effect: trigger right panel when analysis results arrive (must not be conditional)
  useEffect(() => {
    if (!parsed.isJSON) return;
    const analysis = parsed.payload?.analysis;
    if (!analysis) return;
    try {
      const layoutMode = (typeof window !== 'undefined' ? (require('@/state/ui') as any).useUI.getState().layoutMode : undefined);
      const isPortalMode = layoutMode === 'analysis_portal_prep' || layoutMode === 'analysis_running' || layoutMode === 'analysis_results';
      if (isDualPanelMode && !isPortalMode) {
        showPanelWithPlans({
          title: 'Análisis de Póliza',
          plans: [],
          analysis,
          analysisType: 'policy_analysis'
        });
      }
    } catch (err) {
      console.warn('[MR] analysis_results side-effect failed', err);
    }
  }, [parsed.isJSON, parsed.payload?.analysis, isDualPanelMode, showPanelWithPlans]);

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

  // Render templates/cards when no catalog plans are available
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'templates' && Array.isArray(parsed.payload?.items)) {
    const items = parsed.payload.items as Array<{ id: string; title: string; summary?: string }>;
    const header = (t('assistant.templates.header') as any) || 'Sugerencias';
    return (
      <div className="space-y-3">
        <div className="text-[11px] text-muted-foreground">{header}</div>
        <div className="space-y-2">
          {items.map((tpl) => (
            <div key={tpl.id} className="p-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/50">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{tpl.title}</div>
              {tpl.summary && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{tpl.summary}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Force policy_insight card render - must be before any generic text fallback
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'policy_insight') {
    const pi = parsed.payload;
    let hints: any[] = Array.isArray(pi.actionHints) ? pi.actionHints : [];
    
    // Fallback from lastPolicyContext / pageRefs
    if (!hints.length && lastPolicyContext) {
      const pageFromCtx =
        lastPolicyContext.page ??
        lastPolicyContext.context?.pageRefs?.[0]?.page;
      const rectsFromCtx =
        lastPolicyContext.rects ??
        lastPolicyContext.context?.pageRefs?.[0]?.rects;
      if (Number.isFinite(pageFromCtx)) {
        hints = [{ type: 'pdfJump', page: pageFromCtx, rects: rectsFromCtx, __synthetic: true }];
      }
    }
    
    console.info('[MR] policy_insight', {
      hasButton: hints.some(h=>h?.type==='pdfJump' && Number.isFinite(h.page)),
      from: hints[0]?.__synthetic ? 'fallback' : 'actionHints'
    });
    
    return (
      <div className="space-y-2">
        {pi.summary && <p className="text-sm whitespace-pre-wrap break-words">{pi.summary}</p>}
        {Array.isArray(pi.bullets) && (
          <ul className="space-y-1 ml-4">{pi.bullets.map((b: string, i: number)=> <li key={i} className="text-sm list-disc">{b}</li>)}</ul>
        )}
        {hints.filter(h=>h?.type==='pdfJump' && Number.isFinite(h.page)).map((h,i)=>(
          <button
            key={i}
            type="button"
            onClick={()=>{
              console.info('[MR] click pdfJump', { page: h.page, rects: Array.isArray(h.rects)?h.rects.length:0, synthetic: !!h.__synthetic });
              telemetry?.track?.('CHAT_INSIGHT_ACTION_CLICKED', { type:'pdfJump', sectionKey: pi.sectionKey, hasRects: Array.isArray(h.rects)&&h.rects.length>0, synthetic: !!h.__synthetic });
              window.dispatchEvent(new CustomEvent('pdf:jump', { detail: { page: h.page, rects: h.rects, autoClearMs: 5000 } }));
            }}
            className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
            aria-label={(t('portal.actions.view_in_pdf') as any) || (t('openInPdf') as any) || 'Ver en PDF'}
          >
            {(t('portal.actions.view_in_pdf') as any) || (t('openInPdf') as any) || 'Ver en PDF'}
          </button>
        ))}
      </div>
    );
  }

  // Handle empty section guide
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'empty_section_guide') {
    return (
      <div className="space-y-3">
        <p className="text-sm">{parsed.payload.guide}</p>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('pdf:jump', { detail: { page: 1 } }));
          }}
          className="inline-flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        >
          {t('searchInPdf') || 'Buscar en PDF'}
        </button>
      </div>
    );
  }

  // Handle analysis prep
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'analysis_prep') {
    return <AnalysisPrepMessage payload={parsed.payload} />;
  }

  // Handle analysis results
  if (role === 'assistant' && parsed.isJSON && parsed.payload?.type === 'analysis_results' && parsed.payload?.analysis) {
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