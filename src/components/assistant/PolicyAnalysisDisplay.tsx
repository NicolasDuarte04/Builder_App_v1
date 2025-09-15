"use client";

/*
See audit notes in `AIAssistantInterface.tsx` for data source and types context.
UI-only enhancements below: optional page chips, glossary tooltips, risk flags, subtle list polish, and a disabled Export button placeholder.
*/

import React, { useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { telemetry } from '@/lib/telemetry';
import type { AnalysisItem } from '@/types/analysis';
// motion removed to unblock build
import { Shield, DollarSign, AlertTriangle, CheckCircle, TrendingUp, Calendar, XCircle, ChevronDown, ChevronUp, Share2, Link as LinkIcon } from 'lucide-react';
import { Badge } from '../ui/badge';
import { SavePolicyButton } from '../dashboard/SavePolicyButton';
import { toSavedAnalysis } from '@/lib/policy/normalizeAnalysis';
import type { SavedPolicyAnalysis } from '@/types/policies';
import { ENABLE_SAVE_POLICY, ENABLE_PDF_VERIFY } from '@/lib/featureFlags';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/hooks/useTranslation';
import { translateListIfEnglish } from '@/lib/text-translation';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { PdfViewerHandle } from './PdfViewerPane';
const PdfViewerPane = dynamic(() => import('./PdfViewerPane'), { ssr: false });

interface PolicyAnalysis {
  policyType: string;
  premium: {
    amount: number;
    currency: string;
    frequency: string;
  };
  coverage: {
    limits: Record<string, number>;
    deductibles: Record<string, number>;
    exclusions: string[];
    geography?: string;
    claimInstructions?: string[];
  };
  policyDetails: {
    policyNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
    insured: string[];
  };
  insurer?: {
    name?: string;
    contact?: string;
    emergencyLines?: string[];
  };
  premiumTable?: { label?: string; year?: string | number; plan?: string; amount?: number | string }[];
  keyFeatures: string[];
  recommendations: string[];
  riskScore: number;
  riskJustification?: string;
  sourceQuotes?: Record<string, string>;
  redFlags?: string[];
  missingInfo?: string[];
}

interface PolicyAnalysisDisplayProps {
  analysis: PolicyAnalysis;
  pdfUrl?: string;
  fileName?: string;
  rawAnalysisData?: any;
  hideSave?: boolean;
  hidePdfViewer?: boolean;
  uploadId?: string;
  onJumpToPage?: (page: number, rects?: [number,number,number,number][]) => void;
  // Optional scroll root provided by PortalResults for split/expanded modes
  scrollRoot?: HTMLElement | null;
  // First section heading ref for external focus choreography
  firstSectionHeadingRef?: React.RefObject<HTMLHeadingElement | null>;
}

export function PolicyAnalysisDisplay({ analysis, pdfUrl, fileName, rawAnalysisData, hideSave, hidePdfViewer, uploadId, onJumpToPage, scrollRoot, firstSectionHeadingRef }: PolicyAnalysisDisplayProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUserId = (session?.user as any)?.id;
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    if (score <= 6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
  };

  const meta = (analysis as any)?._pdfData || {};
  const safePdfUrl = typeof meta.pdfUrl === 'string' && /^https?:\/\//i.test(meta.pdfUrl) ? meta.pdfUrl : undefined;
  const shouldSendBase64 = !meta.uploadId && !safePdfUrl && typeof pdfUrl === 'string' && /^data:application\/pdf;base64,/i.test(pdfUrl);

  // Local render-only types (backward compatible)
  type Locator = {
    page?: number;
    rects?: [number, number, number, number][];
  };
  type AnalysisBullet = {
    text: string;
    page?: number; // legacy single-field if ever present
    locator?: Locator; // richer optional locator
  };

  // Back-compat mapper: strings → {text}; partials normalized
  const toBullets = (list?: Array<string | Partial<AnalysisBullet>>): AnalysisBullet[] =>
    (list ?? []).map((item) => (typeof item === 'string' ? { text: item } : { text: item?.text ?? '', ...item }));

  const keyFeaturesBullets = toBullets(translateListIfEnglish(analysis.keyFeatures as any, language) as any);
  const exclusionsBullets = toBullets(translateListIfEnglish(analysis.coverage?.exclusions as any, language) as any);
  // Sticky TOC + Scrollspy wiring
  const tocRef = useRef<HTMLDivElement | null>(null);
  const [stickyH, setStickyH] = useState<number>(0);
  const [activeId, setActiveId] = useState<string>('sec-premium');

  // Measure TOC height and publish CSS var on scrollRoot
  useEffect(() => {
    const root = scrollRoot ?? (tocRef.current ? tocRef.current.closest('[data-results-scroll-root="1"]') as HTMLElement | null : null);
    const measure = () => {
      const h = tocRef.current?.offsetHeight ?? 0;
      setStickyH(h);
      if (root) root.style.setProperty('--toc-h', `${h + 8}px`);
    };
    measure();
    // Observe size changes
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && tocRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(tocRef.current);
    }
    return () => { ro?.disconnect(); };
  }, [scrollRoot]);

  // IntersectionObserver for scrollspy
  useEffect(() => {
    const rootEl = scrollRoot ?? (tocRef.current ? tocRef.current.closest('[data-results-scroll-root="1"]') as HTMLElement | null : null);
    if (!rootEl) return;
    const ids = ['sec-premium','sec-limits','sec-deductibles','sec-features','sec-exclusions','sec-risk','sec-recommendations','sec-details','sec-alerts'];
    const targets = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;
    const io = new IntersectionObserver((entries) => {
      // prefer the one nearest to top / highest ratio
      let best: IntersectionObserverEntry | null = null;
      for (const e of entries) {
        if (!best) best = e;
        else if ((e.isIntersecting && !best.isIntersecting) || (e.intersectionRatio > best.intersectionRatio)) best = e;
      }
      if (best) {
        const id = (best.target as HTMLElement).id;
        if (id && id !== activeId) setActiveId(id);
      }
    }, { root: rootEl, threshold: [0, 0.25, 0.5, 1], rootMargin: `-${Math.max(0, stickyH)}px 0px -40% 0px` });
    targets.forEach(t => io.observe(t));
    return () => io.disconnect();
  }, [scrollRoot, stickyH]);

  // Smooth scroll handler for TOC
  const onTocClick = (ev: React.MouseEvent<HTMLAnchorElement, MouseEvent>, id: string) => {
    ev.preventDefault();
    const rootEl = scrollRoot ?? (tocRef.current ? tocRef.current.closest('[data-results-scroll-root="1"]') as HTMLElement | null : null);
    const target = document.getElementById(id);
    if (!rootEl || !target) return;
    const top = rootEl.scrollTop + target.getBoundingClientRect().top - (rootEl.getBoundingClientRect().top) - stickyH - 8;
    rootEl.scrollTo({ top, behavior: 'smooth' });
    setActiveId(id);
  };

  // i18n labels for section headers and actions
  const L = {
    premium: (t('portal.section.premium') as any) || t('analysis.premium') || 'Prima',
    limits: (t('portal.section.limits') as any) || t('analysis.limits') || 'Límites de Cobertura',
    deductibles: (t('portal.section.deductibles') as any) || t('analysis.deductibles') || 'Deducibles',
    features: (t('portal.section.features') as any) || t('analysis.features') || 'Características Principales',
    exclusions: (t('portal.section.exclusions') as any) || t('analysis.exclusions') || 'Exclusiones',
    risk: (t('portal.section.risk') as any) || t('analysis.risk') || 'Evaluación de Riesgo',
    recommendations: (t('portal.section.recommendations') as any) || t('analysis.recommendations') || 'Recomendaciones',
    details: (t('portal.section.details') as any) || t('analysis.details') || 'Detalles de la Póliza',
    alerts: (t('portal.section.alerts') as any) || t('analysis.alerts') || 'Señales de Alerta',
    exportAnnotated: t('analysis.exportAnnotated') || 'Exportar PDF anotado (beta)',
    share: t('analysis.share') || 'Compartir',
    copyLink: t('analysis.copyLink') || 'Copiar enlace',
    summary: t('analysis.summary') || 'Resumen',
    full: t('analysis.full') || 'Completo',
    viewOriginal: (t('portal.actions.view_original_pdf') as any) || t('pdf.viewOriginal') || 'Ver PDF original',
    pdf: t('pdf.header') || 'PDF',
    page: t('pdf.page') || 'Página',
    backToTop: t('pdf.backToTop') || 'Volver arriba',
  };

  // PDF viewer ref for scrolling to pages
  const pdfRef = useRef<PdfViewerHandle>(null);
  // Page chip that scrolls the viewer when clicked and announces
  function PageChip({ page, rects }: { page?: number; rects?: [number,number,number,number][] }) {
    if (!page) return null;
    const isActive = activePage === page;
    return (
      <button
        type="button"
        onClick={() => { 
          if (onJumpToPage) {
            onJumpToPage(page, rects);
          } else {
            pdfRef.current?.scrollToPage(page, true);
            if (rects && pdfRef.current) {
              (pdfRef.current as any).highlightRects?.(page, rects, { autoClearMs: 3000 });
            }
          }
          const live = liveRef.current; 
          if (live) live.textContent = (t('pdf.announcedJump') || 'Saltaste a la página {{page}}').replace('{{page}}', String(page)); 
          telemetry.track('RESULTS_JUMP_TO_PAGE', { page });
          try { telemetry.track(telemetry.events.A11Y_FOCUS_MOVED, { phase: 'results', target: 'pdf_page', page }); } catch {}
        }}
        className={`ml-2 text-[11px] ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-blue-600'} focus:underline`}
        aria-label={`${t('pdf.jumpHere') || 'Ir aquí'}: ${L.page} ${page}`}
      >
        ({t('policy.pageAbbr') || 'p.'} {page})
      </button>
    );
  }

  // Glossary tooltips
  const GLOSSARY: Record<string, string> = {
    deductible: 'Amount you pay before the insurer starts covering costs.',
    copay: 'Fixed amount you pay for a covered service.',
    exclusion: 'What the policy does not cover.',
    limit: 'Maximum amount the insurer will pay.',
  };

  function withGlossary(content: string): React.ReactNode {
    const terms = Object.keys(GLOSSARY).join('|');
    if (!terms) return content;
    const re = new RegExp(`\\b(${terms})\\b`, 'gi');
    const parts: React.ReactNode[] = [];
    let last = 0;
    for (const m of content.matchAll(re)) {
      const [match] = m;
      const start = m.index ?? 0;
      if (start > last) parts.push(content.slice(last, start));
      const gloss = GLOSSARY[match.toLowerCase()];
      if (gloss) {
        parts.push(
          <Tooltip key={`${start}-${match}`}>
            <TooltipTrigger asChild>
              <span className="underline decoration-dotted underline-offset-2 cursor-help">{match}</span>
            </TooltipTrigger>
            <TooltipContent>{gloss}</TooltipContent>
          </Tooltip>
        );
      } else {
        parts.push(match);
      }
      last = start + match.length;
    }
    if (last < content.length) parts.push(content.slice(last));
    return parts;
  }

  // Risk / gap flags (conservative heuristics)
  type Risk = 'red' | 'yellow' | null;
  function inferRisk(text: string): Risk {
    const t = text.toLowerCase();
    if (/(not\s+included|no\s+incluido|exclusion|does\s+not\s+cover)/.test(t)) return 'red';
    if (/deductible/i.test(text)) {
      const numbers = text.match(/\d[\d., ]+/g);
      const value = numbers ? parseFloat(numbers[0].replace(/[^\d.]/g, '')) : 0;
      if (value && value >= 1000) return 'yellow';
    }
    return null;
  }
  function RiskDot({ risk }: { risk: Risk }) {
    if (!risk) return null;
    const cls = risk === 'red' ? 'bg-red-500/80' : 'bg-amber-400/80';
    const label = risk === 'red' ? 'Potential risk: exclusion' : 'Potential risk: high deductible';
    return <span aria-label={label} className={`h-2 w-2 rounded-full self-center mt-1 ${cls}`}></span>;
  }

  const hasAnyPageRefs =
    keyFeaturesBullets.some(b => typeof (b.page ?? b.locator?.page) === 'number') ||
    exclusionsBullets.some(b => typeof (b.page ?? b.locator?.page) === 'number');

  // Collapse defaults: premium open; others collapsed. Persist per uploadId.
  const limitsCount = Object.keys(analysis.coverage?.limits || {}).length;
  const deductiblesCount = Object.keys(analysis.coverage?.deductibles || {}).length;
  const featuresCount = keyFeaturesBullets.length;
  const exclusionsCount = exclusionsBullets.length;
  const alertsCount = Array.isArray(analysis.redFlags) ? analysis.redFlags.length : 0;
  const detailsCount = (
    (analysis.policyDetails.effectiveDate ? 1 : 0) +
    (analysis.policyDetails.expirationDate ? 1 : 0) +
    (analysis.policyDetails.policyNumber ? 1 : 0) +
    ((analysis.policyDetails.insured || []).length > 0 ? 1 : 0) +
    (analysis.insurer?.contact ? 1 : 0) +
    ((analysis.insurer?.emergencyLines || []).length > 0 ? 1 : 0) +
    (analysis.coverage?.geography ? 1 : 0) +
    ((analysis.coverage?.claimInstructions || []).length > 0 ? 1 : 0)
  );

  // Helper to compute item count per section for RESULTS_SECTION_OPEN dispatch
  function getCountForSection(
    k: 'premium'|'limits'|'deductibles'|'features'|'exclusions'|'risk'|'recommendations'|'details'|'alerts'
  ): number {
    switch (k) {
      case 'premium':
        return 1;
      case 'limits':
        return Object.keys(analysis?.coverage?.limits ?? {}).length;
      case 'deductibles':
        return Object.keys(analysis?.coverage?.deductibles ?? {}).length;
      case 'features':
        return keyFeaturesBullets?.length ?? 0;
      case 'exclusions':
        return exclusionsBullets?.length ?? 0;
      case 'risk':
        return analysis?.redFlags?.length ?? 0;
      case 'recommendations':
        return Array.isArray(analysis?.recommendations) ? analysis.recommendations.length : 0;
      case 'details':
        return detailsCount ?? 0;
      case 'alerts':
        return analysis?.redFlags?.length ?? 0;
      default:
        return 0;
    }
  }

  const defaultCollapsed: Record<string, boolean> = {
    premium: false,
    limits: true,
    deductibles: true,
    features: true,
    exclusions: true,
    risk: true,
    recommendations: true,
    details: true,
    alerts: true,
  };
  const storageKey = uploadId ? `briki:analysisUI:${uploadId}` : null;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      if (storageKey) {
        const raw = localStorage.getItem(storageKey);
        if (raw) return { ...defaultCollapsed, ...JSON.parse(raw) };
      }
    } catch {}
    return defaultCollapsed;
  });
  // Track collapsed state transitions for section-open events
  const prevCollapsed = useRef(collapsed);
  useEffect(() => {
    try {
      (Object.keys(collapsed) as (keyof typeof collapsed)[]).forEach((k) => {
        if (prevCollapsed.current[k] === true && collapsed[k] === false && uploadId) {
          const count = getCountForSection(k as any);
          // We are already in an effect; dispatch directly post-commit
          window.dispatchEvent(new CustomEvent('results:section-open', { detail: { uploadId, sectionId: k, count } }));
          try { telemetry.track('RESULTS_SECTION_OPEN', { uploadId, sectionId: k, count }); } catch {}
        }
      });
    } finally {
      prevCollapsed.current = collapsed;
    }
  }, [collapsed, uploadId, analysis, keyFeaturesBullets, exclusionsBullets, detailsCount]);

  const toggle = (k: keyof typeof collapsed) => {
    setCollapsed((s) => {
      const next = { ...s, [k]: !s[k] };
      try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Mapping / sync status for locating bullets in PDF
  const [mappingStatus] = useState<'loading' | 'none' | 'partial' | 'complete'>(() => (hasAnyPageRefs ? 'partial' : 'none'));

  const [activePage, setActivePage] = useState<number>(1);
  const liveRef = useRef<HTMLDivElement>(null);

  // Ask Briki about section with structured context
  function askBriki(
    sectionKey: 'premium'|'limits'|'deductibles'|'features'|'exclusions'|'risk'|'recommendations'|'details'|'alerts',
    sectionLabel: string,
    item?: { text: string; page?: number; locator?: Locator }
  ) {
    if (!uploadId) return;
    // Build count per section
    const getCount = (key: typeof sectionKey): number => {
      switch (key) {
        case 'premium': return 1;
        case 'limits': return Object.keys(analysis.coverage?.limits || {}).length;
        case 'deductibles': return Object.keys(analysis.coverage?.deductibles || {}).length;
        case 'features': return keyFeaturesBullets.length;
        case 'exclusions': return exclusionsBullets.length;
        case 'risk': return Array.isArray(analysis.redFlags) ? analysis.redFlags.length : 0;
        case 'recommendations': return Array.isArray(analysis.recommendations) ? analysis.recommendations.length : 0;
        case 'details': return detailsCount;
        case 'alerts': return Array.isArray(analysis.redFlags) ? analysis.redFlags.length : 0;
      }
    };
    const count = getCount(sectionKey);

    // Build items for context
    type CtxItem = { id?: string; text: string; page?: number; rects?: any };
    let items: CtxItem[] = [];
    let pageRefs: Array<{ page: number; rects?: any }> = [];
    if (sectionKey === 'features') {
      items = keyFeaturesBullets.map((b: any, i: number) => ({ id: String(i), text: b.text, page: b.page ?? b.locator?.page, rects: (b.locator as any)?.rects }));
      pageRefs = items.filter(i => typeof i.page === 'number').map(i => ({ page: i.page as number, rects: i.rects })).slice(0, 8);
    } else if (sectionKey === 'exclusions') {
      items = exclusionsBullets.map((b: any, i: number) => ({ id: String(i), text: b.text, page: b.page ?? b.locator?.page, rects: (b.locator as any)?.rects }));
      pageRefs = items.filter(i => typeof i.page === 'number').map(i => ({ page: i.page as number, rects: i.rects })).slice(0, 8);
    } else if (sectionKey === 'limits') {
      items = Object.entries(analysis.coverage?.limits || {}).map(([k, v]) => ({ text: `${k}: ${formatCurrency(Number(v), analysis.premium.currency)}` }));
    } else if (sectionKey === 'deductibles') {
      items = Object.entries(analysis.coverage?.deductibles || {}).map(([k, v]) => ({ text: `${k}: ${formatCurrency(Number(v), analysis.premium.currency)}` }));
    } else if (sectionKey === 'recommendations') {
      items = (analysis.recommendations || []).map((r, i) => ({ id: String(i), text: r }));
    } else if (sectionKey === 'details') {
      const d: CtxItem[] = [];
      if (analysis.policyDetails.effectiveDate) d.push({ text: `Start: ${analysis.policyDetails.effectiveDate}` });
      if (analysis.policyDetails.expirationDate) d.push({ text: `End: ${analysis.policyDetails.expirationDate}` });
      if ((analysis.policyDetails.insured || []).length) d.push({ text: `Insured: ${(analysis.policyDetails.insured || []).join(', ')}` });
      if (analysis.insurer?.contact) d.push({ text: `Insurer contact: ${analysis.insurer.contact}` });
      items = d;
    } else if (sectionKey === 'risk') {
      items = [{ text: `riskScore: ${analysis.riskScore}` }, ...(analysis.redFlags || []).map((f, i) => ({ id: String(i), text: f }))];
    } else if (sectionKey === 'premium') {
      items = [{ text: `${formatCurrency(Number(analysis?.premium?.amount || 0), analysis?.premium?.currency || 'COP')} / ${analysis?.premium?.frequency || ''}` }];
    } else if (sectionKey === 'alerts') {
      items = (analysis.redFlags || []).map((f, i) => ({ id: String(i), text: f }));
    }

    // Extract page and rects from item.locator if available
    const pageFromItem  = item?.page ?? item?.locator?.page;
    const rectsFromItem = item?.locator?.rects;

    const detail = {
      uploadId,
      sectionKey,
      sectionLabel,
      count,
      page: pageFromItem,
      rects: Array.isArray(rectsFromItem) ? rectsFromItem : undefined,
      itemText: item?.text,
      context: {
        premium: analysis?.premium ? { amount: analysis.premium.amount, currency: analysis.premium.currency, frequency: analysis.premium.frequency } : undefined,
        riskScore: analysis?.riskScore,
        items,
        pageRefs,
      },
    };

    try { telemetry.track('RESULTS_ASK_BRIKI', { sectionKey, uploadId, count }); } catch {}
    try {
      const payloadSize = JSON.stringify(detail.context).length;
      telemetry.track('RESULTS_ASK_CONTEXT_ATTACHED', {
        sectionKey,
        uploadId,
        payloadSize,
        rectCount: Array.isArray(detail.rects) ? detail.rects.length : 0,
      });
    } catch {}

    window.dispatchEvent(new CustomEvent('chat:ask-about-section', { detail }));
  }
  const AnalysisBody = (
    <div className="space-y-3">
      {/* Primary actions */}
      <div className="inline-flex items-center gap-2">
        {/* Guardar análisis (primary) */}
        {analysis && !hideSave && (
          <SavePolicyButton
            policyData={(function toSavePayload(){
              const customName = fileName || analysis?.policyType || analysis?.insurer?.name || 'Póliza sin nombre';
              const currency = analysis?.premium?.currency || 'COP';
              const structured = toSavedAnalysis(analysis);
              return {
                custom_name: customName,
                insurer_name: analysis?.insurer?.name || undefined,
                policy_type: analysis?.policyType || undefined,
                // Prefer server artifacts; avoid base64 for payload size
                pdf_url: safePdfUrl || undefined,
                storage_path: meta?.storagePath || undefined,
                upload_id: meta?.uploadId || undefined,
                uploader_user_id: meta?.uploaderUserId || undefined,
                extracted_data: structured,
                // Compact metadata
                metadata: {
                  premium: analysis?.premium?.amount ?? null,
                  currency,
                  frequency: analysis?.premium?.frequency ?? null,
                  policy_number: analysis?.policyDetails?.policyNumber ?? null,
                  source: 'analysis_modal',
                },
              };
            })()}
          />
        )}
        {/* Hidden unfinished actions for now */}
      </div>

      {/* Table of contents - sticky within scroll container */}
      <nav ref={tocRef as any} className="text-sm text-gray-600 dark:text-gray-400 space-x-3 overflow-x-auto py-2 sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70 border-b border-muted" aria-label={t('common.contents') || 'Contenido'}>
        {[
          ['premium',L.premium],['limits',L.limits],['deductibles',L.deductibles],['features',L.features],['exclusions',L.exclusions],['risk',L.risk],['recommendations',L.recommendations],['details',L.details],['alerts',L.alerts]
        ].map(([k,label]) => {
          const id = `sec-${k}`;
          const isActive = activeId === id;
          return (
            <a
              key={k}
              href={`#${id}`}
              onClick={(e) => onTocClick(e, id)}
              className="hover:underline data-[active=true]:text-blue-600"
              data-active={isActive ? 'true' : 'false'}
              aria-current={isActive ? 'true' : 'false'}
            >
              {label}
            </a>
          );
        })}
      </nav>

      {/* Premium Section (always open, not collapsible) */}
      <section id="sec-premium" className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-1"><DollarSign className="w-5 h-5 text-blue-600" /><h4 ref={firstSectionHeadingRef as any} tabIndex={-1} className="font-semibold text-gray-900 dark:text-white">{language === 'es' ? 'Prima' : L.premium}</h4></div>
        <div className="text-gray-900 dark:text-white">
          <div className="text-xl font-bold">
            {typeof analysis?.premium?.amount === 'number' ? formatCurrency(analysis.premium.amount, analysis.premium.currency) : `${language === 'es' ? 'Prima' : L.premium}: No especificada`}
            {analysis?.premium?.frequency && (
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-1">/{analysis.premium.frequency === 'monthly' ? 'mensual' : analysis.premium.frequency === 'yearly' ? 'anual' : analysis.premium.frequency}</span>
            )}
          </div>
          {(pdfUrl as string) && (
            <div className="mt-2 text-sm"><a href={pdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{L.viewOriginal}</a></div>
          )}
        </div>
      </section>

      {/* Coverage Limits */}
      <section id="sec-limits" className="scroll-mt-16 bg-white dark:bg-gray-800 rounded-xl p-3 border border-muted">
        <button type="button" aria-expanded={!collapsed.limits} aria-controls="content-limits" className="w-full flex items-center justify-between" onClick={() => toggle('limits')}>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-600" /><h4 className="text-base font-semibold text-gray-900 dark:text-white">{L.limits} <span className="text-muted-foreground">({Object.keys(analysis.coverage.limits).length})</span></h4></div>
          {collapsed.limits ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
        {!collapsed.limits && <div id="content-limits" className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.coverage.limits).map(([key, value]) => (
            <div key={key} className="rounded-lg p-3 border border-muted">
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-400 line-clamp-2">{withGlossary(String(key))}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(value, analysis.premium.currency)}
              </p>
            </div>
          ))}
        </div>}
      </section>

      {/* Deductibles */}
      <section id="sec-deductibles" className="scroll-mt-16 bg-white dark:bg-gray-800 rounded-xl p-3 border border-muted">
        <button type="button" aria-expanded={!collapsed.deductibles} aria-controls="content-deductibles" className="w-full flex items-center justify-between" onClick={() => toggle('deductibles')}>
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-600" /><h4 className="text-base font-semibold text-gray-900 dark:text-white">{L.deductibles} <span className="text-muted-foreground">({Object.keys(analysis.coverage.deductibles).length})</span></h4></div>
          {collapsed.deductibles ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
        {!collapsed.deductibles && <div id="content-deductibles" className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.coverage.deductibles).map(([key, value]) => (
            <div key={key} className="rounded-lg p-3 border border-muted">
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-400 line-clamp-2">{withGlossary(String(key))}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(value, analysis.premium.currency)}
              </p>
            </div>
          ))}
        </div>}
      </section>

      {/* Key Features */}
      <section id="sec-features" className="scroll-mt-16 bg-white dark:bg-gray-800 rounded-xl p-3 border border-muted">
        <button type="button" aria-expanded={!collapsed.features} aria-controls="content-features" className="w-full flex items-center justify-between" onClick={() => toggle('features')}>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><h4 className="text-base font-semibold text-gray-900 dark:text-white">{L.features} <span className="text-muted-foreground">({keyFeaturesBullets.length})</span></h4></div>
          {collapsed.features ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
         {!collapsed.features && <ul id="content-features" className="mt-2 space-y-2">
          {keyFeaturesBullets.map((bullet, index) => (
            <li key={index} className="flex gap-2 items-start px-2 py-2 rounded-md hover:bg-muted/40 group">
              <RiskDot risk={inferRisk(bullet.text)} />
              <div className="flex-1">
                <div className="leading-relaxed text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                  {withGlossary(bullet.text)}
                  <PageChip page={bullet.page ?? bullet.locator?.page} rects={(bullet.locator as any)?.rects} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => askBriki('features', L.features, bullet)}
                className="ml-2 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={(t('portal.actions.ask_briki') as any) || t('results.ask_briki') || 'Preguntar a Briki'}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>}
      </section>

      {/* Exclusions */}
      {analysis.coverage.exclusions.length > 0 && (
        <section id="sec-exclusions" className="scroll-mt-16 bg-white dark:bg-gray-800 rounded-xl p-3 border border-muted">
          <button type="button" aria-expanded={!collapsed.exclusions} aria-controls="content-exclusions" className="w-full flex items-center justify-between" onClick={() => toggle('exclusions')}>
          <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" /><h4 className="text-base font-semibold text-gray-900 dark:text-white">{L.exclusions} <span className="text-muted-foreground">({exclusionsBullets.length})</span></h4></div>
            {collapsed.exclusions ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
          </button>
          {!collapsed.exclusions && <ul id="content-exclusions" className="mt-2 space-y-2">
            {exclusionsBullets.map((bullet, index) => (
              <li key={index} className="flex gap-2 items-start px-2 py-2 rounded-md hover:bg-muted/40 group">
                <RiskDot risk={inferRisk(bullet.text)} />
                <div className="flex-1">
                  <div className="leading-relaxed text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                    {withGlossary(bullet.text)}
                    <PageChip page={bullet.page ?? bullet.locator?.page} rects={(bullet.locator as any)?.rects} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => askBriki('exclusions', L.exclusions, bullet)}
                  className="ml-2 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={(t('portal.actions.ask_briki') as any) || t('results.ask_briki') || 'Preguntar a Briki'}
                  title={(t('portal.actions.ask_briki') as any) || t('results.ask_briki') || 'Preguntar a Briki'}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>}
        </section>
      )}

      {/* Risk Assessment */}
      <section id="sec-risk" className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-800">
        <button type="button" aria-expanded={!collapsed.risk} aria-controls="content-risk" className="w-full flex items-center justify-between" onClick={() => toggle('risk')}>
          <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-600" /><h4 className="font-semibold text-gray-900 dark:text-white">{L.risk}</h4></div>
          <Badge className={getRiskColor(analysis.riskScore)}>{analysis.riskScore}/10</Badge>
          {collapsed.risk ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
        {!collapsed.risk && (
          <div id="content-risk" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <p>
              {analysis.riskScore <= 3 ? 'Riesgo bajo' : analysis.riskScore <= 6 ? 'Riesgo moderado' : 'Riesgo alto'}
            </p>
            {analysis.riskJustification && <p className="mt-2 text-gray-700 dark:text-gray-300">{analysis.riskJustification}</p>}
          </div>
        )}
      </section>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <section id="sec-recommendations" className="scroll-mt-16 bg-white dark:bg-gray-800 rounded-xl p-3 border border-muted">
          <button type="button" aria-expanded={!collapsed.recommendations} aria-controls="content-recommendations" className="w-full flex items-center justify-between" onClick={() => toggle('recommendations')}>
            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /><h4 className="text-base font-semibold text-gray-900 dark:text-white">{L.recommendations} <span className="text-muted-foreground">({analysis.recommendations.length})</span></h4></div>
            {collapsed.recommendations ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
          </button>
          {!collapsed.recommendations && (
            <div id="content-recommendations" className="mt-2 space-y-2">
              {analysis.recommendations.map((recommendation, index) => (
                <div key={index} className="group flex items-start gap-2 px-2 py-2 rounded-md hover:bg-muted/40">
                  <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-2" title={recommendation}>{recommendation}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Policy Details */}
      <section id="sec-details" className="scroll-mt-16 bg-white dark:bg-gray-800 rounded-xl p-3 border border-muted">
        <button type="button" aria-expanded={!collapsed.details} aria-controls="content-details" className="w-full flex items-center justify-between" onClick={() => toggle('details')}>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-600" /><h4 className="text-base font-semibold text-gray-900 dark:text-white">{L.details}</h4></div>
          {collapsed.details ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
        {!collapsed.details && <div id="content-details" className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm leading-6">
          {analysis.policyDetails.effectiveDate && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Fecha de inicio</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.policyDetails.effectiveDate}</p>
            </div>
          )}
          {analysis.policyDetails.expirationDate && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Fecha de vencimiento</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.policyDetails.expirationDate}</p>
            </div>
          )}
          {analysis.policyDetails.insured.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-gray-600 dark:text-gray-400">Asegurados</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {analysis.policyDetails.insured.join(', ')}
              </p>
            </div>
          )}
          {analysis.insurer?.contact && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Contacto de la aseguradora</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.insurer.contact}</p>
            </div>
          )}
          {analysis.insurer?.emergencyLines && analysis.insurer.emergencyLines.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-gray-600 dark:text-gray-400">Líneas de emergencia</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.insurer.emergencyLines.join(', ')}</p>
            </div>
          )}
          {analysis.coverage?.geography && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Cobertura geográfica</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.coverage.geography}</p>
            </div>
          )}
          {analysis.coverage?.claimInstructions && analysis.coverage.claimInstructions.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-gray-600 dark:text-gray-400">Instrucciones de reclamo</p>
              <ul className="list-disc ml-5 text-gray-900 dark:text-white">
                {analysis.coverage.claimInstructions.map((step, idx) => (
                  <li key={idx} className="mb-1">{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>}
      </section>

      {/* Traceability: Source quotes, red flags, missing info */}
      {(analysis.sourceQuotes && Object.keys(analysis.sourceQuotes).length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <details>
            <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white">Citas de origen (sourceQuotes)</summary>
            <div className="mt-3 space-y-2">
              {Object.entries(analysis.sourceQuotes).map(([k, v]) => (
                <div key={k} className="text-sm">
                  <p className="text-gray-600 dark:text-gray-400">{k}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{v}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {(analysis.redFlags && analysis.redFlags.length > 0) && (
        <section id="sec-alerts" className="scroll-mt-16 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <button type="button" aria-expanded={!collapsed.alerts} aria-controls="content-alerts" className="w-full flex items-center justify-between" onClick={() => toggle('alerts')}>
            <h4 className="font-semibold text-red-800 dark:text-red-200">{L.alerts} ({analysis.redFlags.length})</h4>
            {collapsed.alerts ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
          </button>
          {!collapsed.alerts && (
            <ul id="content-alerts" className="mt-2 list-disc ml-5 text-sm text-red-900 dark:text-red-100">
              {analysis.redFlags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(analysis.missingInfo && analysis.missingInfo.length > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Información faltante</h4>
          <ul className="list-disc ml-5 text-sm text-yellow-900 dark:text-yellow-100">
            {analysis.missingInfo.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save Policy Section - temporarily hidden by flag */}
      {ENABLE_SAVE_POLICY && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center text-center">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              ¿Te gustaría guardar este análisis en tu Bóveda de Seguros?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md">
              Guarda este análisis para acceder fácilmente a los detalles de tu póliza en cualquier momento.
            </p>
            {meta.uploaderUserId && sessionUserId && meta.uploaderUserId !== sessionUserId && (
              <p className="text-xs text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300 px-3 py-2 rounded mb-3">
                Este análisis fue generado con otra cuenta.
              </p>
            )}
            <SavePolicyButton
              policyData={{
                custom_name: fileName || `${analysis.policyType} - ${new Date().toLocaleDateString()}`,
                insurer_name: analysis.insurer?.name || 'Sin Aseguradora',
                policy_type: analysis.policyType || 'General',
                priority: analysis.riskScore <= 3 ? 'low' : analysis.riskScore <= 6 ? 'medium' : 'high',
                pdf_base64: shouldSendBase64 ? pdfUrl : undefined,
                pdf_url: safePdfUrl,
                upload_id: meta.uploadId,
                storage_path: meta.storagePath,
                uploader_user_id: meta.uploaderUserId,
                metadata: {
                  policy_number: analysis.policyDetails.policyNumber,
                  effective_date: analysis.policyDetails.effectiveDate,
                  expiration_date: analysis.policyDetails.expirationDate,
                  premium_amount: analysis.premium.amount,
                  premium_currency: analysis.premium.currency,
                  premium_frequency: analysis.premium.frequency,
                  risk_score: analysis.riskScore,
                },
                extracted_data: rawAnalysisData || analysis,
              }}
              onSuccess={() => {
                router.push('/dashboard/insurance');
              }}
            />
          </div>
        </div>
      )}
      {/* TODO(back-end): extend analysis extractor to return { text, page, bbox? } for bullets */}
      {/* TODO(viewer): add /viewer?file=<url>#page=X and wire PageChip */}

    </div>
  );

  if (!ENABLE_PDF_VERIFY || hidePdfViewer) {
    return (
      <TooltipProvider>
        {AnalysisBody}
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-[1400px] w-[95vw] h-[90vh]">
        <div className="sr-only" aria-live="polite" ref={liveRef}></div>
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Left: analysis column (6/12) independent scroll */}
          <div className="col-span-12 md:col-span-6 min-w-0 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {!hasAnyPageRefs && (
            <div className="mb-2 text-xs text-gray-500">{t('policy.pageLocationsHint') || 'Page locations will appear when available.'}</div>
          )}
          {AnalysisBody}
            <div className="sticky bottom-4 flex justify-end pointer-events-none">
              <button type="button" onClick={() => { document.querySelector('nav[aria-label="Contenido"]')?.scrollIntoView({ behavior: 'smooth' }); }} className="pointer-events-auto px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 shadow">Volver arriba</button>
            </div>
          </div>

          {/* Right: sticky PDF viewer (6/12) independent scroll */}
          <div className="col-span-12 md:col-span-6 min-w-[430px]">
            <div className="sticky top-20">
              <div className="h-[calc(100vh-120px)] rounded-xl border bg-white dark:bg-neutral-950 shadow-sm overflow-hidden">
                <div className="h-full overflow-auto p-3" style={{ scrollbarGutter: 'stable' as any }}>
                  <PdfViewerPane ref={pdfRef} url={safePdfUrl || (pdfUrl as string)} onVisiblePageChange={(p)=>setActivePage(p)} labels={{ pdf: L.pdf, page: L.page }} />
                  {mappingStatus !== 'complete' && (
                    <div className="mt-2 text-[11px] text-gray-500">Sincronización con el PDF: {mappingStatus === 'none' ? 'no disponible' : mappingStatus}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
} 