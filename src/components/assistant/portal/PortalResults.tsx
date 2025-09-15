"use client";

import { PolicyAnalysisDisplay } from '@/components/assistant/PolicyAnalysisDisplay';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PdfViewerHandle } from '@/components/assistant/PdfViewerPane';
import { useAnalyzer } from '@/state/analyzer';
import { useTranslation } from '@/hooks/useTranslation';

const PdfViewerPane = dynamic(() => import('@/components/assistant/PdfViewerPane'), { ssr: false });

export default function PortalResults({ analysis, pdfUrl, viewerUrl, reason }: { analysis: any; pdfUrl?: string; viewerUrl?: string | null; reason?: string }) {
  const liveRef = useRef<HTMLDivElement|null>(null);
  const headingRef = useRef<HTMLHeadingElement|null>(null);
  const [expanded, setExpanded] = useState(false);
  const pdfRef = useRef<PdfViewerHandle | null>(null);
  const expandBtnRef = useRef<HTMLButtonElement | null>(null);
  const divideBtnRef = useRef<HTMLButtonElement | null>(null);
  const [overlayPage, setOverlayPage] = useState<number | null>(null);
  // Unified results scroll root (points to the visible scroller depending on mode)
  const resultsScrollRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();
  const firstSectionHeadingRef = useRef<HTMLHeadingElement | null>(null);

  function getOverlayTitle() {
    try {
      const insurer = (analysis?.insurer?.name || '').trim();
      const policy = ((analysis?.policyName || analysis?.policyType) || '').trim();
      if (insurer || policy) return [insurer, policy].filter(Boolean).join(' — ');
      const url = (viewerUrl || pdfUrl || '') as string;
      const name = url.split('?')[0].split('#')[0].split('/').pop() || 'PDF';
      return name;
    } catch {
      return 'PDF';
    }
  }

  useEffect(() => {
    // Announce results
    if (liveRef.current) {
      liveRef.current.textContent = String((t as any)('portal.subtitle') || 'Resultados del análisis listos');
    }
    
    // Focus first section heading (results phase)
    const target = firstSectionHeadingRef.current || headingRef.current;
    if (target) {
      try { target.focus(); } catch {}
      try { telemetry.track(telemetry.events.A11Y_FOCUS_MOVED, { phase: 'results', target: 'first_section_heading' }); } catch {}
      try { telemetry.track(telemetry.events.RESULTS_FOCUSED_SECTION, { section: 'premium' }); } catch {}
    }

    // Step-2 analytics: BRIEF_PARSED_SUCCESS when analysis is available
    if (analysis && !reason) {
      const fieldsFilled = Object.keys(analysis).length;
      const sourcesCount = analysis.sourceQuotes ? Object.keys(analysis.sourceQuotes).length : 0;
      
      getUserContext().then(({ sessionId, userId }) => {
        const start = (typeof performance !== 'undefined' ? performance.getEntriesByName('click.start').at(0) : null) as any;
        const latencyMs = start ? Date.now() - start.startTime : 0;
        
        telemetry.track(telemetry.events.BRIEF_PARSED_SUCCESS, {
          fieldsFilled,
          latencyMs,
          sourcesCount,
          sessionId,
          userId
        });
      });
    }

    // Track mount
    telemetry.track('RESULTS_MOUNTED', { hasAnalysis: !!analysis });
    try {
      const start = (typeof performance !== 'undefined' ? performance.getEntriesByName('click.start').at(0) : null) as any;
      if (start) {
        const durationMs = Date.now() - start.startTime;
        telemetry.track(telemetry.events.PORTAL_COMPLETED, { durationMs });
      }
    } catch {}
  }, [analysis, reason]);

  // Mobile: announce viewer collapsed at initial render on small viewports
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      try { telemetry.track(telemetry.events.MOBILE_VIEWER_COLLAPSED, { width: window.innerWidth, height: window.innerHeight }); } catch {}
    }
  }, []);

  // Listen for pdf:jump from chat and control the viewer
  useEffect(() => {
    function onPdfJump(e: Event) {
      const d = (e as CustomEvent).detail || {};
      console.info('[Portal] pdf:jump', { page: d.page, rectCount: Array.isArray(d.rects)?d.rects.length:0 });
      
      // Check if PDF is available
      if (!viewerUrl && !pdfUrl) {
        // Show a non-blocking notice
        if (liveRef.current) {
          liveRef.current.textContent = String((t as any)('policy.noPdf') || 'No hay PDF disponible para verificación.');
        }
        return;
      }
      
      const jump = () => {
        try { telemetry.track('PDF_JUMP_FROM_CHAT', { uploadId: useAnalyzer.getState().uploadId, page: d.page, rectCount: Array.isArray(d.rects) ? d.rects.length : 0 }); } catch {}
        // Console confirmation per acceptance
        console.info('PDF_JUMP_FROM_CHAT', { page: d.page, rectCount: Array.isArray(d.rects) ? d.rects.length : 0 });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Latest jump wins: clear previous highlights first
            pdfRef.current?.clearHighlights?.();
            pdfRef.current?.scrollToPage(d.page, true);
            if (Array.isArray(d.rects) && d.rects.length > 0) {
              (pdfRef.current as any)?.highlightRects?.(d.page, d.rects, { autoClearMs: d.autoClearMs ?? 5000 });
            }
            // Track telemetry
            try { telemetry.track('PDF_HIGHLIGHTS_CLEARED', { page: d.page }); } catch {}
          });
        });
      };
      if (!expanded) {
        setExpanded(true);
        // defer jump until overlay mounts
        setTimeout(jump, 60);
      } else {
        jump();
      }
    }
    window.addEventListener('pdf:jump', onPdfJump);
    return () => window.removeEventListener('pdf:jump', onPdfJump);
  }, [expanded, viewerUrl, pdfUrl]);

  // Toggle handler
  const handleToggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    // Announce the change
    if (liveRef.current) {
      liveRef.current.textContent = newExpanded 
        ? String((t as any)('portal.actions.expand_pdf') || 'Vista expandida activada')
        : String((t as any)('portal.actions.split') || 'Vista dividida activada');
    }
  };

  // Esc to close overlay and body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && expanded) setExpanded(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    if (expanded) document.body.style.overflow = 'hidden';
    // focus management
    if (expanded) {
      setTimeout(() => divideBtnRef.current?.focus(), 0);
    } else {
      setTimeout(() => expandBtnRef.current?.focus(), 0);
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  // Quota-friendly UI: show message; no viewer in split
  if (!analysis && reason === 'quota') {
    return (
      <section className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden h-[calc(100vh-var(--nav-h)-var(--hdr-h)-24px)]" role="region" aria-label="Resultados del análisis">
        <div ref={resultsScrollRef} data-results-scroll-root="1" className="p-4 sm:p-5 space-y-4 overflow-auto flex-1">
          <div className="flex justify-end">
            <Button ref={expandBtnRef} variant="outline" size="sm" onClick={handleToggleExpand} disabled={!viewerUrl && !pdfUrl} aria-label={String((t as any)('portal.actions.expand_pdf') || 'Expandir análisis')}>
              <Maximize2 className="h-4 w-4 mr-1" />
              {String((t as any)('portal.actions.expand_pdf') || 'Expandir')}
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold mb-2">{String((t as any)('portal.empty_state.title') || 'No pudimos analizar por límite de cuota')}</h2>
            <p className="text-sm text-muted-foreground">{String((t as any)('portal.empty_state.body') || 'Cambia el modelo o la clave de OpenAI y vuelve a intentar.')}</p>
          </div>
        </div>
      </section>
    );
  }

  // Split view (default): results inside placeholder; no viewer
  if (!expanded) {
    return (
      <section className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden h-[calc(100vh-var(--nav-h)-var(--hdr-h)-24px)]" role="region" aria-label="Resultados del análisis">
        <div className="sr-only" aria-live="polite" ref={liveRef}></div>
        <div ref={resultsScrollRef} data-results-scroll-root="1" className="p-4 sm:p-5 space-y-4 overflow-auto flex-1">
          <div className="flex justify-end">
            <Button
              ref={expandBtnRef}
              variant="outline"
              size="sm"
              onClick={handleToggleExpand}
              aria-label={String((t as any)('portal.actions.expand_pdf') || 'Expandir análisis')}
              title={String((t as any)('portal.actions.expand_pdf') || 'Expandir análisis')}
              disabled={!viewerUrl && !pdfUrl}
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              {String((t as any)('portal.actions.expand_pdf') || 'Expandir')}
            </Button>
          </div>
          {/* Mobile-only primary CTA to view original PDF */}
          <div className="md:hidden">
            <Button
              type="button"
              onClick={() => { try { telemetry.track(telemetry.events.VIEW_ORIGINAL_PDF_CLICKED, {}); } catch {} ; setExpanded(true); }}
              className="w-full"
              aria-label={String((t as any)('portal.actions.view_original_pdf') || 'Ver PDF original')}
              title={String((t as any)('portal.actions.view_original_pdf') || 'Ver PDF original')}
              disabled={!viewerUrl && !pdfUrl}
            >
              {String((t as any)('portal.actions.view_original_pdf') || 'Ver PDF original')}
            </Button>
          </div>
          <PolicyAnalysisDisplay 
            analysis={analysis} 
            pdfUrl={pdfUrl || analysis?._pdfData?.pdfUrl}
            hidePdfViewer={true}
            uploadId={(useAnalyzer.getState().uploadId || undefined) as string | undefined}
            scrollRoot={resultsScrollRef.current}
            firstSectionHeadingRef={firstSectionHeadingRef as any}
            // Split: expand first, then jump
            onJumpToPage={(page: number, rects?: [number,number,number,number][]) => {
              setExpanded(true);
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  // Latest jump wins: clear previous highlights first
                  pdfRef.current?.clearHighlights?.();
                  pdfRef.current?.scrollToPage(page, true);
                  if (rects && rects.length) {
                    (pdfRef.current as any)?.highlightRects?.(page, rects);
                  }
                });
              });
            }}
          />
        </div>
      </section>
    );
  }

  // Expanded overlay with two columns
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-neutral-950" role="dialog" aria-modal="true">
      <div className="sr-only" aria-live="polite" ref={liveRef}></div>
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
        <h2 ref={headingRef} tabIndex={-1} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getOverlayTitle()}
        </h2>
        <div className="flex items-center gap-2">
          <Button ref={divideBtnRef} variant="outline" size="sm" onClick={handleToggleExpand} aria-label={String((t as any)('portal.actions.split') || 'Cambiar a vista dividida')} title={String((t as any)('portal.actions.split') || 'Cambiar a vista dividida')}>
            <Minimize2 className="h-4 w-4 mr-1" />
            {String((t as any)('portal.actions.split') || 'Dividir')}
          </Button>
          {typeof overlayPage === 'number' && (
            <span className="text-xs text-muted-foreground" aria-live="polite">{`${String((t as any)('pdf.header') || 'PDF')} • ${String((t as any)('pdf.page') || 'Página')} ${overlayPage}`}</span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 p-3">
        <div ref={resultsScrollRef} data-results-scroll-root="1" className="col-span-12 lg:col-span-6 min-w-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 70px)' }}>
          <PolicyAnalysisDisplay 
            analysis={analysis} 
            pdfUrl={pdfUrl || analysis?._pdfData?.pdfUrl}
            hidePdfViewer={true}
            uploadId={(useAnalyzer.getState().uploadId || undefined) as string | undefined}
            scrollRoot={resultsScrollRef.current}
            firstSectionHeadingRef={firstSectionHeadingRef as any}
            // Expanded: jump directly
            onJumpToPage={(page: number, rects?: [number,number,number,number][]) => {
              // Latest jump wins: clear previous highlights first
              pdfRef.current?.clearHighlights?.();
              pdfRef.current?.scrollToPage(page, true);
              if (rects && rects.length) {
                (pdfRef.current as any)?.highlightRects?.(page, rects);
              }
            }}
          />
        </div>
        <div className="col-span-12 lg:col-span-6 min-w-[430px]">
          <div className="h-[calc(100vh-70px)] overflow-auto p-3">
            {viewerUrl || pdfUrl ? (
              <PdfViewerPane 
                ref={pdfRef} 
                url={viewerUrl || pdfUrl || ''} 
                labels={{ pdf: String((t as any)('pdf.header') || 'PDF'), page: String((t as any)('pdf.page') || 'Página') }} 
                onVisiblePageChange={(p: number) => {
                  setOverlayPage(p);
                }}
                onPageChange={(p: number) => {
                  setOverlayPage(p);
                  try { telemetry.track('PDF_PAGE_CHANGED', { page: p }); } catch {}
                  pdfRef.current?.clearHighlights?.();
                }}
              />
            ) : (
              <div className="text-sm text-muted-foreground p-4">{String((t as any)('policy.noPdf') || 'No hay PDF disponible.')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
