'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanResultCard } from '@/components/PlanResultCard';
import { AnalyzerPanel } from '@/components/copilot/AnalyzerPanel';
import { AIAssistantInterface } from '@/components/assistant/AIAssistantInterface';
import { PlanResultsProvider } from '@/contexts/PlanResultsContext';
import { BootOverlay } from '@/components/BootOverlay';
import { BriefPanel } from '@/components/brief/BriefPanel';
import { useProposal } from '@/state/proposal';
import { useUI } from '@/state/ui';
import { useAnalyzer } from '@/state/analyzer';
import { useAnalyzerUI, isValidAnalyzerSource } from '@/state/analyzerUI';
import { useBriefStore } from '@/state/briefStore';
import { useRouter } from 'next/navigation';
import { FileText, Sparkles, AlertCircle } from 'lucide-react';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { ENABLE_BRC_PORTAL, DEBUG_PORTAL } from '@/lib/featureFlags';
import { assignIncredibleBrief } from '@/lib/flags';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import IconRail from '@/components/assistant/IconRail';
import PortalPrep from '@/components/assistant/portal/PortalPrep';
import PortalRunning from '@/components/assistant/portal/PortalRunning';
import PortalResults from '@/components/assistant/portal/PortalResults';
import { flushSync } from 'react-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { getOrCreateSessionId } from '@/lib/chat/session-prefs-client';
import { toast } from '@/hooks/use-toast';
import { useIsBriefCollapsed, useUILayoutStore } from '@/state/uiLayoutStore';
import { useUiPhase } from '@/state/proposal';

export default function AssistantPage() {
  useEffect(() => { track('assistant_opened'); }, []);
  const router = useRouter();
  const { t } = useTranslation();
  const brief = useProposal((s) => s.brief);
  const shortlist = useProposal((s) => s.shortlist);
  const selected = useProposal((s) => s.selected);
  const setBrief = useProposal((s) => s.setBrief);
  const setShortlist = useProposal((s) => s.setShortlist);
  const isSelected = useProposal((s) => s.isSelected);
  const toggleSelect = useProposal((s) => s.toggleSelect);
  const setUiPhase = useProposal((s) => s.setUiPhase);
  const layoutMode = useUI((s) => s.layoutMode);
  const loadFromServer = useBriefStore((s) => s.loadFromServer);
  const briefCategory = useBriefStore((s) => s.brief?.category);
  const setBriefInStore = useBriefStore((s) => s.setBrief);
  const isPortalMode = layoutMode === 'analysis_portal_prep' || layoutMode === 'analysis_running' || layoutMode === 'analysis_results';
  const [loading, setLoading] = useState(false);
  const isAnalyzerExpanded = useAnalyzerUI((s) => s.isOpen);
  const setIsAnalyzerExpanded = useAnalyzerUI((s) => s.setOpen);
  const [analyzingPlan, setAnalyzingPlan] = useState<any>(null);
  const isBriefCollapsed = useIsBriefCollapsed();
  const setBriefCollapsed = useUILayoutStore((s) => s.setBriefCollapsed);
  const setBriefManualOpen = useUILayoutStore((s) => s.setBriefManualOpen);
  const setBriefManualClosed = useUILayoutStore((s) => s.setBriefManualClosed);
  const uiPhase = useUiPhase();
  const isResultsPhase = uiPhase === 'results';
  const flowStarted = uiPhase !== 'welcome';
  const collapseMode: 'inplace' | 'window' = uiPhase === 'welcome' ? 'inplace' : 'window';
  const handleToggleBriefPanel = useCallback(() => {
    if (isBriefCollapsed) {
      setBriefManualOpen();
      setBriefCollapsed(false);
    } else {
      setBriefManualClosed();
      setBriefCollapsed(true);
    }
  }, [isBriefCollapsed, setBriefManualOpen, setBriefManualClosed, setBriefCollapsed]);
  const [, setChatSeed] = useState<{ brief: any; shortlist: any[] } | null>(null);
  const [boot, setBoot] = useState(true);
  const briefSectionRef = useRef<HTMLDivElement | null>(null);
  const didLoadBriefRef = useRef(false);
  const [portalAnalysis, setPortalAnalysis] = useState<any>(null);
  const [portalViewerUrl, setPortalViewerUrl] = useState<string | null>(null);
  const analyzerPanelRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    const t = setTimeout(() => setBoot(false), 1200);
    return () => clearTimeout(t);
  }, []);

  // Client-side session hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (didLoadBriefRef.current) return;
      didLoadBriefRef.current = true;
      const loadSession = async () => {
        try {
          const sessionId = await getOrCreateSessionId();
          // For now, use a placeholder userId - in production this would come from auth
          const userId = 'guest-user';
          await loadFromServer(userId, sessionId);
        } catch (error) {
          console.warn('Failed to load session data:', error);
        }
      };
      
      void loadSession();
    }
  }, []);

  // Feature flag assignment for ff_incredible_brief
  useEffect(() => {
    (async () => {
      try {
        const { sessionId, userId } = await getUserContext();
        const force = new URLSearchParams(window.location.search).get('ff_incredible_brief') === '1' ? 'on' : undefined;
        const variant = assignIncredibleBrief(sessionId, force);
        telemetry.track(telemetry.events.FF_ASSIGNMENT, {
          flag: 'ff_incredible_brief',
          variant,
          method: force ? 'forced' : 'hash(sessionId)',
          pct: Number(process.env.NEXT_PUBLIC_FF_INCREDIBLE_BRIEF_PCT ?? '10'),
          sessionId, 
          userId,
        });
        // If you actually gate UI/logic, set a local state or context here
      } catch (error) {
        console.warn('Failed to assign feature flag:', error);
      }
    })();
  }, []);

  // Auto-advance to results when shortlist arrives
  useEffect(() => {
    if (shortlist && shortlist.length > 0) {
      setUiPhase('results');
    }
  }, [shortlist.length, setUiPhase]);

  // Sync useProposal brief with briefStore when brief changes
  useEffect(() => {
    const computedCategory = brief ? getCategoryFromCode(brief.category_code) : undefined;
    if (brief && (briefCategory !== computedCategory)) {
      // Convert useProposal brief format to briefStore format
      const briefStoreFormat = {
        id: `brief-${Date.now()}`,
        userId: 'guest-user',
        sessionId: 'temp-session',
        locale: 'es' as const,
        source: 'manual' as const,
        category: getCategoryFromCode(brief.category_code),
        maxBudgetCop: brief.budget_high,
        mustHaveCoverages: brief.must_haves || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        isApplied: true,
      };
      setBriefInStore(briefStoreFormat);
    }
  }, [brief, briefCategory, setBriefInStore]);

  // Helper function to convert category code to Spanish name
  const getCategoryFromCode = (code: string): 'Vehículos'|'Salud'|'Viajes'|'Vida'|'Hogar'|'Otro' => {
    const categoryMap: Record<string, 'Vehículos'|'Salud'|'Viajes'|'Vida'|'Hogar'|'Otro'> = {
      auto: 'Vehículos',
      health: 'Salud',
      life: 'Vida', 
      travel: 'Viajes',
      home: 'Hogar',
    };
    return categoryMap[code] || 'Otro';
  };

  // Handle briki:open-brief event from WelcomeHero
  useEffect(() => {
    const handler = () => {
      // Telemetry: Brief panel opened
      getUserContext().then(({ sessionId, userId }) => {
        telemetry.track(telemetry.events.BRIEF_PANEL_OPENED || 'brief_panel_opened', { sessionId, userId });
      });
      // Scroll to brief panel
      requestAnimationFrame(() => {
        briefSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('briki:open-brief', handler);
    return () => window.removeEventListener('briki:open-brief', handler);
  }, []);

  // Handle briki:open-analyzer-panel (legacy) with strict source gating
  useEffect(() => {
    const handler = (e: Event) => {
      const source = (e as CustomEvent)?.detail?.source;
      if (!isValidAnalyzerSource(source)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ANALYZER] blocked: unknown source');
        }
        return;
      }
      setAnalyzingPlan(null);
      try { useAnalyzerUI.getState().open(source); } catch {}
    };
    window.addEventListener('briki:open-analyzer-panel', handler as EventListener);
    return () => window.removeEventListener('briki:open-analyzer-panel', handler as EventListener);
  }, []);

  // Auto-scroll to analyzer panel when it opens
  useEffect(() => {
    if (isAnalyzerExpanded && analyzerPanelRef.current) {
      // Small delay to ensure the panel is rendered
      setTimeout(() => {
        analyzerPanelRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
    }
  }, [isAnalyzerExpanded]);

  // Handle briki:pdf-selected event for layout transition
  useEffect(() => {
    const onPdf = (e: Event) => {
      if (DEBUG_PORTAL) {
        console.log('[DEBUG_PORTAL] PDF selected event fired');
        console.log('[DEBUG_PORTAL] ENABLE_BRC_PORTAL:', ENABLE_BRC_PORTAL);
        console.log('[DEBUG_PORTAL] Current layoutMode:', useUI.getState().layoutMode);
      }
      try {
        telemetry.track(telemetry.events.LAYOUT_MODE_CHANGED || 'layout_mode_changed', {
          from: useUI.getState().layoutMode,
          to: ENABLE_BRC_PORTAL ? 'analysis_portal_prep' : 'analysis_prep'
        });
        if (ENABLE_BRC_PORTAL && (telemetry as any)?.events?.PORTAL_OPENED) {
          telemetry.track((telemetry as any).events.PORTAL_OPENED, {});
        }
        // Track oversize files if size is available (soft signal; UI handles UX)
        try {
          const detail = (e as CustomEvent).detail as any;
          const size = Number(detail?.size || 0);
          const MAX_BYTES = 10 * 1024 * 1024; // 10MB soft limit for portal UX
          if (size > MAX_BYTES) {
            telemetry.track(telemetry.events.FILE_SIZE_REJECTED || 'file_size_rejected', {
              size,
              maxBytes: MAX_BYTES,
              fileName: detail?.name || undefined,
            });
          }
        } catch {}
      } catch {}
      // Collapse left rail and expand chat
      if (ENABLE_BRC_PORTAL) {
        // If already in portal prep, do nothing to avoid flicker
        if (useUI.getState().layoutMode === 'analysis_portal_prep') {
          if (DEBUG_PORTAL) console.log('[DEBUG_PORTAL] Already in analysis_portal_prep, skipping setLayoutMode');
        } else {
          useUI.getState().setLayoutMode('analysis_portal_prep');
          if (DEBUG_PORTAL) console.log('[DEBUG_PORTAL] Layout mode changed to: analysis_portal_prep');
        }
      } else {
        const newMode = 'analysis_prep';
        useUI.getState().setLayoutMode(newMode);
        if (DEBUG_PORTAL) console.log('[DEBUG_PORTAL] Layout mode changed to:', newMode);
      }
      // Brief panel is now always visible - no need to close
      // Enter prep phase for portal
      try { setUiPhase('prep' as any); } catch {}
      // Inject prelude message via event (chat handles rendering) unless portal is enabled
      if (!ENABLE_BRC_PORTAL) {
        window.dispatchEvent(new CustomEvent("briki:analysis-prep"));
      } else {
        // In portal mode, dispatch narration event for the chat
        const detail = (e as CustomEvent).detail;
        if (detail?.name && detail?.size) {
          window.dispatchEvent(new CustomEvent("briki:portal-prep-narration", {
            detail: { fileName: detail.name, fileSize: detail.size }
          }));
        }
      }
    };
    window.addEventListener("briki:pdf-selected", onPdf);
    return () => window.removeEventListener("briki:pdf-selected", onPdf);
  }, []);

  // Handle briki:start-analysis to kick off analysis with instructions
  useEffect(() => {
    const onStart = async (ev: Event) => {
      if (DEBUG_PORTAL) {
        console.log('[DEBUG_PORTAL] Start analysis event fired');
        console.log('[DEBUG_PORTAL] Current layoutMode:', useUI.getState().layoutMode);
      }
      try {
        const detail = (ev as CustomEvent).detail || {};
        const { file, note, focusAreas } = useAnalyzer.getState();
        if (!file) {
          console.warn('No file selected for analysis');
          return;
        }
        if (DEBUG_PORTAL) {
          console.log('[DEBUG_PORTAL] Starting analysis with file:', file.name);
          console.log('[DEBUG_PORTAL] Focus areas:', focusAreas);
        }
        // Client-side size guard (10MB)
        const LIMIT = 10 * 1024 * 1024;
        if (typeof file.size === 'number' && file.size > LIMIT) {
          const sizeMB = Number((file.size / (1024 * 1024)).toFixed(1));
          try { telemetry.track('FILE_SIZE_REJECTED', { sizeMB, limitMB: 10 }); } catch {}
          try {
            const { toast } = await import('@/hooks/use-toast');
            const title = String((t as any)("portal.file_too_large") || 'Archivo demasiado grande');
            const body = String((t as any)("portal.empty_state.body") || `El archivo supera el límite permitido (máx 10 MB).`);
            toast({ title, description: `${body} (${sizeMB} MB > 10 MB)`, variant: 'default' });
          } catch {}
          // Stay in prep; do not enter running phase
          try { useUI.getState().setLayoutMode('analysis_portal_prep'); } catch {}
          return;
        }
        // Enter running phase for portal
        try { setUiPhase('running' as any); } catch {}
        // Immediate optimistic UI update - flip layout before making request
        const runningMode = ENABLE_BRC_PORTAL ? 'analysis_running' : 'analysis_focus';
        if (DEBUG_PORTAL) { try { performance.mark('click.start'); } catch {} }
        try {
          telemetry.track(telemetry.events.LAYOUT_MODE_CHANGED || 'layout_mode_changed', {
            from: useUI.getState().layoutMode,
            to: runningMode
          });
          if (ENABLE_BRC_PORTAL && (telemetry as any)?.events?.RUN_STARTED) {
            telemetry.track((telemetry as any).events.RUN_STARTED, {});
          }
        } catch {}
        try {
          flushSync(() => useUI.getState().setLayoutMode(runningMode));
        } catch {
          useUI.getState().setLayoutMode(runningMode);
        }
        if (DEBUG_PORTAL) {
          console.log('[perf] layout flipped →', runningMode);
        }

        const fd = new FormData();
        fd.append('file', file);
        fd.append('instructions', JSON.stringify({ note, focusAreas }));

        const controller = new AbortController();
        try { useAnalyzer.getState().setAbortController(controller); } catch {}
        try {
          const res = await fetch('/api/ai/analyze-policy', { method: 'POST', body: fd, signal: controller.signal });
          if (!res.ok) {
            // Handle server 413 specifically
            if (res.status === 413) {
              let limitMB = 10;
              try { const j = await res.json(); if (j?.limitMB) limitMB = Number(j.limitMB) || 10; } catch {}
              try {
                const { toast } = await import('@/hooks/use-toast');
                const title = String((t as any)("portal.file_too_large") || 'Archivo demasiado grande');
                const body = String((t as any)("portal.empty_state.body") || `El archivo supera el límite permitido`);
                toast({ title, description: `${body} (máx ${limitMB} MB)`, variant: 'default' });
              } catch {}
              useUI.getState().setLayoutMode('analysis_portal_prep');
              return;
            }
            let reason: any = `(${res.status})`;
            try { const j = await res.json(); reason = j?.message || j?.error || reason; } catch {}
            try {
              const { toast } = await import('@/hooks/use-toast');
              const title = String((t as any)("portal.error_start") || 'No se pudo iniciar el análisis');
              toast({
                title,
                description: typeof reason === 'string' ? reason : 'Error del servidor',
                variant: 'destructive',
              });
            } catch {}
            useUI.getState().setLayoutMode('analysis_portal_prep');
            return;
          }
          const data = await res.json();
          // Store uploadId for polling
          const uid = (data && data.uploadId) ? String(data.uploadId) : null;
          const sig = data?.statusSig ? String(data.statusSig) : null;
          if (uid) { try { useAnalyzer.getState().setUploadId(uid); } catch {} }
          if (sig) { try { useAnalyzer.getState().setStatusSig(sig); } catch {} }
          // Start polling status in portal mode
          if (ENABLE_BRC_PORTAL && uid) {
            // Immediate flip to running already happened; emit first tick
            window.dispatchEvent(new CustomEvent('analysis:progress', { detail: { uploadId: uid, status: 'queued', progress: 10 } }));
            try { telemetry.track(telemetry.events.RUN_PROGRESS, { uploadId: uid, status: 'queued', progress: 10 }); } catch {}
          }
        } catch (e: any) {
          // aborted or failed
          if (e?.name === 'AbortError') {
            try {
              telemetry.track(telemetry.events.ANALYZER_CANCELLED, {});
              telemetry.track(telemetry.events.ANALYSIS_ABORTED, { reason: 'abort_signal' });
            } catch {}
          } else {
            console.error('Error starting analysis', e);
          }
        } finally {
          try { useAnalyzer.getState().setAbortController(null); } catch {}
        }

        // Keep uiPhase as 'running' during processing in portal

        // In portal mode, transition to results is handled by poller in PortalRunning

        // In portal mode, defer assistant message injection until result is ready (handled by poller). For non-portal, keep existing message.
        if (!ENABLE_BRC_PORTAL) {
          const structuredMessage = {
            role: 'assistant',
            content: 'Análisis completado.',
            type: 'analysis_results',
            analysis: null,
            timestamp: new Date().toISOString()
          };
          window.dispatchEvent(new CustomEvent('briki:assistant-message', { detail: structuredMessage }));
        }
      } catch (err) {
        console.error('Error starting analysis', err);
      }
    };
    window.addEventListener('briki:start-analysis', onStart);
    return () => window.removeEventListener('briki:start-analysis', onStart);
  }, [setUiPhase]);

  // Create proposal handler - must be declared before useEffect that references it
  const handleCreateProposal = useCallback(async () => {
    if (selected.length === 0) return;
    
    const startTime = Date.now();
    const { sessionId, userId } = await getUserContext();
    
    try {
      toast({ title: String((t as any)('proposal.generating') || 'Generando…') });
    } catch {}

    telemetry.track(telemetry.events.PROPOSAL_CREATED, {
      planCount: selected.length,
      hasAnalysis: selected.some(p => p.analysis),
      category: brief?.category_code,
      sessionId,
      userId
    });
    
    const payload = {
      broker_id: 'TODO',
      client_id: 'TODO', 
      brief_id: null,
      shortlist: selected,
    };
    
    const res = await fetch('/api/copilot/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let message: any = `(${res.status})`;
      try { const j = await res.json(); message = j?.error || j?.message || message; } catch {}
      try {
        toast({ title: String((t as any)('proposal.error') || 'No se pudo generar la propuesta'), description: String(message || ''), variant: 'destructive' });
      } catch {}
      return;
    }
    
    const data = await res.json();
    if (data?.id) {
      const latencyMs = Date.now() - startTime;
      // Track successful proposal creation with additional metrics
      telemetry.track('PROPOSAL_CREATED_SUCCESS', {
        proposalId: data.id,
        latencyMs,
        planCount: selected.length,
        hasAnalysis: selected.some(p => p.analysis),
        sessionId,
        userId
      });
      
      try {
        toast({ title: String((t as any)('proposal.created') || 'Propuesta creada'), description: String((t as any)('proposal.ready') || 'Tu PDF está listo para compartir') });
      } catch {}

      // Navigate after creation
      router.push(`/proposals/${data.id}`);
    }
  }, [selected, brief?.category_code, router]);

  // Handle briki:create-proposal event from QuickActionBar
  useEffect(() => {
    const onCreate = () => { void handleCreateProposal(); };
    window.addEventListener('briki:create-proposal', onCreate);
    return () => window.removeEventListener('briki:create-proposal', onCreate);
  }, [handleCreateProposal]);


  // Fetch shortlist when brief is submitted
  async function handleBriefSubmit(formBrief: any) {
    setBrief(formBrief);
    setLoading(true);
    setUiPhase('processing');
    
    let sessionId: string = 'unknown';
    try {
      const ctx = await getUserContext();
      sessionId = ctx?.sessionId || 'unknown';
    } catch {}

    telemetry.track(telemetry.events.INTAKE_SUBMITTED, {
      category: formBrief.category_code,
      budget: formBrief.budget_high,
      mustHaves: formBrief?.must_haves?.length ?? 0,
    });
    
    try {
      const payload = {
        category: formBrief.category_code,
        country: 'CO',
        maxPrice: formBrief.budget_high,
        mustHaves: formBrief.must_haves,
        sessionId,
      };

      const res = await fetch('/api/copilot/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const plans = data?.plans;
        setShortlist(plans ?? []);
        telemetry.track(telemetry.events.SHORTLIST_FETCHED, { count: plans?.length ?? 0, sessionId });
        // Set chat seed once when results arrive
        if (plans && plans.length > 0) {
          setChatSeed({ brief: formBrief, shortlist: plans });
        }
      } else {
        setShortlist([]);
        telemetry.track(telemetry.events.SHORTLIST_FAILED, { status: res.status, sessionId });
      }
    } catch (error) {
      console.error('Error fetching shortlist:', error);
      setShortlist([]);
      telemetry.track(telemetry.events.SHORTLIST_FAILED, { status: 'network_error', sessionId });
    } finally {
      setLoading(false);
    }
  }

  function handleAnalyzePlan(plan: any) {
    if (!plan) {
      // Open PDF upload modal
      // This should trigger the same handler as the chat's "Analyze Policy PDF"
      // For now, we'll just log it
      console.log('Open PDF analyzer');
      return;
    }
    setAnalyzingPlan(plan);
    setIsAnalyzerExpanded(true);
    telemetry.track(telemetry.events.ANALYZER_OPENED, {
      planId: plan.id,
      planName: plan.name_es,
    });
  }

  return (
    <div className="min-h-screen bg-background" data-build-id={process.env.NEXT_PUBLIC_BUILD_ID || ''}>
      <BootOverlay show={boot} />

      {/* Main workspace */}
      <div
        className="mx-auto w-full px-4 pb-10 pt-[calc(var(--nav-h,64px)-8px)] max-w-full xl:max-w-[calc(100vw-300px)]"
        style={{
          ['--nav-h' as any]: '64px',       // keep or compute dynamically
          ['--hdr-h' as any]: '0px',         // no header strip now
        }}
      >
        <section className="relative">
          {/* header + grid go inside here */}
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-12 gap-2 min-h-[calc(100vh-var(--nav-h)-var(--hdr-h))]",
            isPortalMode && "bg-gradient-to-b from-[var(--briki-from)]/6 via-transparent to-[var(--briki-to)]/8"
          )}>
          {/* Left rail: brief & analyzer (hidden when results + collapsed; shown again if user expands) */}
          {!isPortalMode && !(isResultsPhase && isBriefCollapsed) && (
            <motion.section 
              ref={briefSectionRef} 
              className={cn(
                (layoutMode === "analysis_prep") ? "hidden lg:block lg:col-span-1" : "lg:col-span-4",
                "space-y-4"
              )}
              style={(layoutMode === "analysis_prep") ? { width: 48 } : undefined}
              aria-hidden={(layoutMode === "analysis_prep") ? "true" : "false"}
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
            >
            {layoutMode === "analysis_prep" ? (
              <IconRail />
            ) : (
              <>
            {/* Brief Panel - Replaces inline brief card */}
            <BriefPanel 
              isCollapsed={isBriefCollapsed}
              onToggleCollapse={handleToggleBriefPanel}
              collapseMode={collapseMode}
            />
            
            {/* Analyze Policy (PDF) Button - Separate full-width action */}
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // Debug log only in development
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[ANALYZE_BTN] Clicked - toggling analyzer panel');
                  }
                  setAnalyzingPlan(null);
                  try { useAnalyzerUI.getState().open('sidebarCTA'); } catch {}
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setAnalyzingPlan(null);
                    try { useAnalyzerUI.getState().open('sidebarCTA'); } catch {}
                  }
                }}
                aria-expanded={isAnalyzerExpanded}
                aria-controls="analyzer-panel"
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-1" />
                Analizar póliza (PDF)
              </Button>
              
              {/* Analyzer Panel - Attached to the button */}
              <div ref={analyzerPanelRef}>
                <AnalyzerPanel
                  isExpanded={isAnalyzerExpanded}
                  onToggle={setIsAnalyzerExpanded}
                  plan={analyzingPlan}
                  onAnalysisComplete={(payload) => {
                    // Create structured assistant message for right panel
                    const structuredMessage = {
                      role: 'assistant',
                      content: payload.analysisSummary,
                      type: 'analysis_results',
                      analysis: (payload as any).analysis || null,
                      timestamp: new Date().toISOString()
                    };
                    
                    // Dispatch event to notify the assistant interface
                    window.dispatchEvent(new CustomEvent('briki:assistant-message', {
                      detail: structuredMessage
                    }));
                  }}
                />
              </div>
            </div>
            
            {/* Loading State */}
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}
            
            {/* Shortlist */}
            {!loading && shortlist.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Top 3 Recomendados</h3>
                  <Badge variant="outline">
                    <Sparkles className="h-3 w-3 mr-1" />
                    IA
                  </Badge>
                </div>
                {shortlist.map((plan) => (
                  <PlanResultCard
                    key={plan.id}
                    plan={plan}
                    selected={isSelected(plan.id)}
                    onAnalyze={() => handleAnalyzePlan(plan)}
                    onToggle={() => toggleSelect(plan)}
                  />
                ))}
              </div>
            )}
            
            {/* Empty State */}
            {!loading && brief && shortlist.length === 0 && (
              <div className="rounded-xl border bg-card p-5 sm:p-6 py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No encontramos opciones</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Intenta ajustar los criterios de búsqueda
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      telemetry.track(telemetry.events.EMPTY_STATE_CLICKED, { action: 'increase_budget' });
                    }}
                  >
                    Ampliar presupuesto
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      telemetry.track(telemetry.events.EMPTY_STATE_CLICKED, { action: 'fewer_requirements' });
                    }}
                  >
                    Menos requisitos
                  </Button>
                </div>
              </div>
            )}
              </>
            )}
            </motion.section>
          )}

          {/* Portal container */}
          {isPortalMode && (
            <motion.main className="col-span-12 md:col-span-8" initial={false} animate={{ opacity: 1 }} transition={{ type:'spring', stiffness:240, damping:28 }}>
              {(() => {
                const currentMode = useUI.getState().layoutMode;
                
                if (currentMode === 'analysis_results') {
                  // Fetch analysis if not already loaded
                  if (!portalAnalysis) {
                    const uploadId = useAnalyzer.getState().uploadId;
                    if (uploadId) {
                      fetch(`/api/ai/analyze-policy/result?uploadId=${uploadId}`)
                        .then(res => res.json())
                        .then(data => {
                          if (data.analysis) {
                            setPortalAnalysis(data.analysis);
                          }
                          if (data.viewerUrl) {
                            setPortalViewerUrl(data.viewerUrl);
                          }
                        })
                        .catch(err => console.error('[portal] Failed to fetch results:', err));
                    }
                    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
                  }
                  const reason = useAnalyzer.getState().lastErrorReason;
                  return <PortalResults analysis={portalAnalysis} pdfUrl={portalAnalysis?._pdfData?.pdfUrl} viewerUrl={portalViewerUrl} reason={reason || undefined} />;
                }
                
                if (currentMode === 'analysis_running') {
                  const uid = (useAnalyzer.getState().uploadId || '') as string;
                  return uid ? <PortalRunning uploadId={uid} /> : <PortalPrep />;
                }
                
                return <PortalPrep />;
              })()}
            </motion.main>
          )}

          {/* Right rail: chat */}
          <motion.aside className={cn(
            isPortalMode
              ? "col-span-12 md:col-span-4 md:border-l md:border-muted md:pl-1 md:bg-muted/5"
              : (layoutMode === "analysis_prep")
                ? "md:col-span-11"
                : (isResultsPhase ? (isBriefCollapsed ? "md:col-span-12" : "md:col-span-8") : "md:col-span-8")
          )}
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
          >
            <motion.div
              className="rounded-xl border bg-card flex flex-col overflow-hidden h-[70vh] lg:h-[calc(100vh-var(--nav-h)-var(--hdr-h)-24px)] p-0"
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              // 70vh on small screens; on lg+ we consume viewport height minus navbar+header and a small offset
            >
              <PlanResultsProvider defaultDualPanelMode={false}>
                <AIAssistantInterface
                  mode="embedded"
                  initialSeed={brief && shortlist.length ? { brief, shortlist } : null}
                />
              </PlanResultsProvider>
            </motion.div>
          </motion.aside>
          </div>
        </section>
      </div>

      {/* Global Components */}
    </div>
  );
}