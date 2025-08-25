"use client";

/*
See audit notes in `AIAssistantInterface.tsx` for data source and types context.
UI-only enhancements below: optional page chips, glossary tooltips, risk flags, subtle list polish, and a disabled Export button placeholder.
*/

import React, { useRef, useState } from 'react';
// motion removed to unblock build
import { Shield, DollarSign, AlertTriangle, CheckCircle, TrendingUp, Calendar, XCircle, ChevronDown, ChevronUp, Share2, Link as LinkIcon } from 'lucide-react';
import { Badge } from '../ui/badge';
import { SavePolicyButton } from '../dashboard/SavePolicyButton';
import { ENABLE_SAVE_POLICY, ENABLE_PDF_VERIFY } from '@/lib/featureFlags';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/hooks/useTranslation';
import { translateListIfEnglish } from '@/lib/text-translation';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
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
}

export function PolicyAnalysisDisplay({ analysis, pdfUrl, fileName, rawAnalysisData }: PolicyAnalysisDisplayProps) {
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
    // stretch: phrase?: string;
    // stretch: bbox?: [number, number, number, number];
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

  // i18n labels for section headers and actions
  const L = {
    premium: t('analysis.premium') || 'Prima',
    limits: t('analysis.limits') || 'Límites de Cobertura',
    deductibles: t('analysis.deductibles') || 'Deducibles',
    features: t('analysis.features') || 'Características Principales',
    exclusions: t('analysis.exclusions') || 'Exclusiones',
    risk: t('analysis.risk') || 'Evaluación de Riesgo',
    recommendations: t('analysis.recommendations') || 'Recomendaciones',
    details: t('analysis.details') || 'Detalles de la Póliza',
    alerts: t('analysis.alerts') || 'Señales de Alerta',
    exportAnnotated: t('analysis.exportAnnotated') || 'Exportar PDF anotado (beta)',
    share: t('analysis.share') || 'Compartir',
    copyLink: t('analysis.copyLink') || 'Copiar enlace',
    summary: t('analysis.summary') || 'Resumen',
    full: t('analysis.full') || 'Completo',
    viewOriginal: t('pdf.viewOriginal') || 'Ver PDF original',
    pdf: t('pdf.header') || 'PDF',
    page: t('pdf.page') || 'Página',
    backToTop: t('pdf.backToTop') || 'Volver arriba',
  };

  // PDF viewer ref for scrolling to pages
  const pdfRef = useRef<PdfViewerHandle>(null);
  // Page chip that scrolls the viewer when clicked and announces
  function PageChip({ page }: { page?: number }) {
    if (!page) return null;
    const isActive = activePage === page;
    return (
      <button
        type="button"
        onClick={() => { pdfRef.current?.scrollToPage(page, true); const live = liveRef.current; if (live) live.textContent = (t('pdf.announcedJump') || 'Saltaste a la página {{page}}').replace('{{page}}', String(page)); }}
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

  // Collapse defaults: premium open (not collapsible). Others: collapsed if >=10 items, else open. Risk/Recommendations collapsed.
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

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    premium: false, // always open
    limits: limitsCount >= 10,
    deductibles: deductiblesCount >= 10,
    features: featuresCount >= 10,
    exclusions: exclusionsCount >= 10,
    risk: true,
    recommendations: true,
    details: detailsCount >= 10,
    alerts: alertsCount >= 10,
  });
  const toggle = (k: keyof typeof collapsed) => setCollapsed((s) => ({ ...s, [k]: !s[k] }));

  // Mapping / sync status for locating bullets in PDF
  const [mappingStatus] = useState<'loading' | 'none' | 'partial' | 'complete'>(() => (hasAnyPageRefs ? 'partial' : 'none'));

  const [activePage, setActivePage] = useState<number>(1);
  const liveRef = useRef<HTMLDivElement>(null);
  const AnalysisBody = (
    <div className="space-y-4">
      {/* Primary actions */}
      <div className="inline-flex items-center gap-2">
        {/* Guardar análisis (primary) */}
        {analysis && (
          <SavePolicyButton
            policyData={(function toSavePayload(){
              const customName = fileName || analysis?.policyType || analysis?.insurer?.name || 'Póliza sin nombre';
              const currency = analysis?.premium?.currency || 'COP';
              return {
                custom_name: customName,
                insurer_name: analysis?.insurer?.name || null,
                policy_type: analysis?.policyType || null,
                // Prefer server artifacts; avoid base64 for payload size
                pdf_url: safePdfUrl || undefined,
                storage_path: meta?.storagePath || undefined,
                upload_id: meta?.uploadId || undefined,
                uploader_user_id: meta?.uploaderUserId || undefined,
                // Compact metadata
                metadata: {
                  premium: analysis?.premium?.amount ?? null,
                  currency,
                  frequency: analysis?.premium?.frequency ?? null,
                  policy_number: analysis?.policyDetails?.policyNumber ?? null,
                  source: 'analysis_modal',
                },
                // Compact extracted selection only
                extracted_data: {
                  coverages: analysis?.coverage?.limits ? Object.keys(analysis.coverage.limits) : [],
                  deductibles: analysis?.coverage?.deductibles ? Object.keys(analysis.coverage.deductibles) : [],
                  exclusions: analysis?.coverage?.exclusions ?? [],
                  recommendations: analysis?.recommendations ?? [],
                },
              };
            })()}
          />
        )}
        {/* Hidden unfinished actions for now */}
      </div>

      {/* Table of contents */}
      <nav className="text-sm text-gray-600 dark:text-gray-400 space-x-3 overflow-x-auto py-1" aria-label={t('common.contents') || 'Contenido'}>
        {[
          ['premium',L.premium],['limits',L.limits],['deductibles',L.deductibles],['features',L.features],['exclusions',L.exclusions],['risk',L.risk],['recommendations',L.recommendations],['details',L.details],['alerts',L.alerts]
        ].map(([k,label]) => (
          <a key={k} href={`#sec-${k}`} className="hover:underline">{label}</a>
        ))}
      </nav>

      {/* Premium Section (always open, not collapsible) */}
      <section id="sec-premium" className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-1"><DollarSign className="w-5 h-5 text-blue-600" /><h4 className="font-semibold text-gray-900 dark:text-white">{language === 'es' ? 'Prima' : L.premium}</h4></div>
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
      <section id="sec-limits" className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
        <button type="button" className="w-full flex items-center justify-between" onClick={() => toggle('limits')}>
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-600" /><h4 className="font-semibold text-gray-900 dark:text-white">{L.limits} ({Object.keys(analysis.coverage.limits).length})</h4></div>
          {collapsed.limits ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
        {!collapsed.limits && <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.coverage.limits).map(([key, value]) => (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">{withGlossary(String(key))}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(value, analysis.premium.currency)}
              </p>
            </div>
          ))}
        </div>}
      </section>

      {/* Deductibles */}
      <section id="sec-deductibles" className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
        <button type="button" className="w-full flex items-center justify-between" onClick={() => toggle('deductibles')}>
          <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-600" /><h4 className="font-semibold text-gray-900 dark:text-white">{L.deductibles} ({Object.keys(analysis.coverage.deductibles).length})</h4></div>
          {collapsed.deductibles ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
        {!collapsed.deductibles && <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.coverage.deductibles).map(([key, value]) => (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">{withGlossary(String(key))}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(value, analysis.premium.currency)}
              </p>
            </div>
          ))}
        </div>}
      </section>

      {/* Key Features */}
      <section id="sec-features" className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
        <button type="button" className="w-full flex items-center justify-between" onClick={() => toggle('features')}>
          <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /><h4 className="font-semibold text-gray-900 dark:text-white">{L.features} ({keyFeaturesBullets.length})</h4></div>
          {collapsed.features ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
         {!collapsed.features && <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
          {keyFeaturesBullets.map((bullet, index) => (
            <li key={index} className="flex gap-2 items-start px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-900/40">
              <RiskDot risk={inferRisk(bullet.text)} />
              <div className="leading-6 text-[13px] text-gray-800 dark:text-gray-200">
                {withGlossary(bullet.text)}
                <PageChip page={bullet.page ?? bullet.locator?.page} />
              </div>
            </li>
          ))}
        </ul>}
      </section>

      {/* Exclusions */}
      {analysis.coverage.exclusions.length > 0 && (
        <section id="sec-exclusions" className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <button type="button" className="w-full flex items-center justify-between" onClick={() => toggle('exclusions')}>
          <div className="flex items-center gap-2"><XCircle className="w-5 h-5 text-red-600" /><h4 className="font-semibold text-gray-900 dark:text-white">{L.exclusions} ({exclusionsBullets.length})</h4></div>
            {collapsed.exclusions ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
          </button>
          {!collapsed.exclusions && <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            {exclusionsBullets.map((bullet, index) => (
              <li key={index} className="flex gap-2 items-start px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-900/40">
                <RiskDot risk={inferRisk(bullet.text)} />
                <div className="leading-6 text-[13px] text-gray-800 dark:text-gray-200">
                {withGlossary(bullet.text)}
                <PageChip page={bullet.page ?? bullet.locator?.page} />
                </div>
              </li>
            ))}
          </ul>}
        </section>
      )}

      {/* Risk Assessment */}
      <section id="sec-risk" className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-800">
        <button type="button" className="w-full flex items-center justify-between" onClick={() => toggle('risk')}>
          <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-600" /><h4 className="font-semibold text-gray-900 dark:text-white">{L.risk}</h4></div>
          <Badge label={`${analysis.riskScore}/10`} variant="neutral" className={getRiskColor(analysis.riskScore)} />
          {collapsed.risk ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
        {!collapsed.risk && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <p>
              {analysis.riskScore <= 3 ? 'Riesgo bajo' : analysis.riskScore <= 6 ? 'Riesgo moderado' : 'Riesgo alto'}
            </p>
            {analysis.riskJustification && <p className="mt-2 text-gray-700 dark:text-gray-300">{analysis.riskJustification}</p>}
          </div>
        )}
      </section>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <section id="sec-recommendations" className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <button type="button" className="w-full flex items-center justify-between" onClick={() => toggle('recommendations')}>
            <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /><h4 className="font-semibold text-gray-900 dark:text-white">{L.recommendations} ({analysis.recommendations.length})</h4></div>
            {collapsed.recommendations ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
          </button>
          {!collapsed.recommendations && (
            <div className="mt-2 space-y-2">
              {analysis.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{recommendation}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Policy Details */}
      <section id="sec-details" className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
        <button type="button" className="w-full flex items-center justify-between" onClick={() => toggle('details')}>
          <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-gray-600" /><h4 className="font-semibold text-gray-900 dark:text-white">{L.details}</h4></div>
          {collapsed.details ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
        </button>
        {!collapsed.details && <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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
        <section id="sec-alerts" className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
          <button type="button" className="w-full flex items-center justify-between" onClick={() => toggle('alerts')}>
            <h4 className="font-semibold text-red-800 dark:text-red-200">{L.alerts} ({analysis.redFlags.length})</h4>
            {collapsed.alerts ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
          </button>
          {!collapsed.alerts && (
            <ul className="mt-2 list-disc ml-5 text-sm text-red-900 dark:text-red-100">
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

  if (!ENABLE_PDF_VERIFY) {
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