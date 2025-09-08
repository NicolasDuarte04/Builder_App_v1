'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlanResultCard } from '@/components/PlanResultCard';
import { AnalyzerPanel } from '@/components/copilot/AnalyzerPanel';
import { AIAssistantInterface } from '@/components/assistant/AIAssistantInterface';
import { BootOverlay } from '@/components/BootOverlay';
import { useProposal } from '@/state/proposal';
import { useUI } from '@/state/ui';
import { useAnalyzer } from '@/state/analyzer';
import { useRouter } from 'next/navigation';
import { FileText, Sparkles, AlertCircle } from 'lucide-react';
import { telemetry } from '@/lib/telemetry';
import { ENABLE_BRC_PORTAL, DEBUG_PORTAL } from '@/lib/featureFlags';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import IconRail from '@/components/assistant/IconRail';
import PortalPrep from '@/components/assistant/portal/PortalPrep';
import PortalRunning from '@/components/assistant/portal/PortalRunning';

export default function AssistantPage() {
  const router = useRouter();
  const { brief, shortlist, selected, setBrief, setShortlist, isSelected, toggleSelect, setUiPhase } = useProposal();
  const { layoutMode } = useUI();
  const isPortalMode = layoutMode === 'analysis_portal_prep' || layoutMode === 'analysis_running' || layoutMode === 'analysis_results';
  const [loading, setLoading] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [isAnalyzerExpanded, setIsAnalyzerExpanded] = useState(false);
  const [analyzingPlan, setAnalyzingPlan] = useState<any>(null);
  const [, setChatSeed] = useState<{ brief: any; shortlist: any[] } | null>(null);
  const [boot, setBoot] = useState(true);
  const briefSectionRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState({
    category_code: brief?.category_code || 'auto',
    budget_high: brief?.budget_high || '',
    must_haves: brief?.must_haves?.join(', ') || '',
  });
  
  useEffect(() => {
    const t = setTimeout(() => setBoot(false), 1200);
    return () => clearTimeout(t);
  }, []);

  // Auto-advance to results when shortlist arrives
  useEffect(() => {
    if (shortlist && shortlist.length > 0) {
      setUiPhase('results');
    }
  }, [shortlist?.length, setUiPhase]);

  // Handle briki:open-brief event from WelcomeHero
  useEffect(() => {
    const handler = () => {
      setBriefOpen(true); // ensure expanded
      // small delay to let layout expand before scrolling
      requestAnimationFrame(() => {
        briefSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('briki:open-brief', handler);
    return () => window.removeEventListener('briki:open-brief', handler);
  }, []);

  // Handle briki:open-analyzer-panel event from WelcomeHero
  useEffect(() => {
    const handler = () => {
      setAnalyzingPlan(null);
      setIsAnalyzerExpanded(true);
    };
    window.addEventListener('briki:open-analyzer-panel', handler);
    return () => window.removeEventListener('briki:open-analyzer-panel', handler);
  }, []);

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
      // If brief panel is open, close it (optional, maintain your existing state)
      setBriefOpen(false);
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
        // Set phase to analyzing
        setUiPhase('analyzing_pdf');
        // Optional: flip layout to running/focus
        try {
          telemetry.track(telemetry.events.LAYOUT_MODE_CHANGED || 'layout_mode_changed', {
            from: useUI.getState().layoutMode,
            to: ENABLE_BRC_PORTAL ? 'analysis_running' : 'analysis_focus'
          });
          if (ENABLE_BRC_PORTAL && (telemetry as any)?.events?.RUN_STARTED) {
            telemetry.track((telemetry as any).events.RUN_STARTED, {});
          }
        } catch {}
        const runningMode = ENABLE_BRC_PORTAL ? 'analysis_running' : 'analysis_focus';
        useUI.getState().setLayoutMode(runningMode);
        if (DEBUG_PORTAL) {
          console.log('[DEBUG_PORTAL] Layout mode changed to:', runningMode);
        }

        const fd = new FormData();
        fd.append('file', file);
        fd.append('instructions', JSON.stringify({ note, focusAreas }));

        const controller = new AbortController();
        try { useAnalyzer.getState().setAbortController(controller); } catch {}
        try {
          const res = await fetch('/api/ai/analyze-policy', { method: 'POST', body: fd, signal: controller.signal });
          if (!res.ok) {
            let reason: any = `(${res.status})`;
            try { const j = await res.json(); reason = j?.message || j?.error || reason; } catch {}
            try {
              const { toast } = await import('@/hooks/use-toast');
              toast({
                title: 'No se pudo iniciar el análisis',
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
          if (uid) { try { useAnalyzer.getState().setUploadId(uid); } catch {} }
          // Start polling status in portal mode
          if (ENABLE_BRC_PORTAL && uid) {
            // Immediate flip to running already happened; emit first tick
            window.dispatchEvent(new CustomEvent('analysis:progress', { detail: { uploadId: uid, status: 'queued', progress: 10 } }));
            try { telemetry.track(telemetry.events.RUN_PROGRESS, { uploadId: uid, status: 'queued', progress: 10 }); } catch {}
          }
        } catch (e: any) {
          // aborted or failed
          if (e?.name === 'AbortError') {
            try { telemetry.track(telemetry.events.ANALYZER_CANCELLED, {}); } catch {}
          } else {
            console.error('Error starting analysis', e);
          }
        } finally {
          try { useAnalyzer.getState().setAbortController(null); } catch {}
        }

        // Move to processing after request sent
        setUiPhase('processing');

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
    
    telemetry.track(telemetry.events.PROPOSAL_CREATED, {
      planCount: selected.length,
      hasAnalysis: selected.some(p => p.analysis),
      category: brief?.category_code,
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
    
    const data = await res.json();
    if (data?.id) {
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

  const handleInlineBriefSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const brief = {
      category_code: formData.category_code,
      budget_high: Number(formData.budget_high),
      must_haves: formData.must_haves
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    };
    handleBriefSubmit(brief);
    setBriefOpen(false);
  };

  // Fetch shortlist when brief is submitted
  async function handleBriefSubmit(formBrief: any) {
    setBrief(formBrief);
    setLoading(true);
    setBriefOpen(false);
    setUiPhase('processing');
    
    telemetry.track(telemetry.events.INTAKE_SUBMITTED, {
      category: formBrief.category_code,
      budget: formBrief.budget_high,
      mustHaves: formBrief.must_haves.length,
    });
    
    try {
      const res = await fetch('/api/copilot/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formBrief),
      });
      const data = await res.json();
      setShortlist(data || []);
      
      // Set chat seed once when results arrive
      if (data && data.length > 0) {
        setChatSeed({ brief: formBrief, shortlist: data });
      }
    } catch (error) {
      console.error('Error fetching shortlist:', error);
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
    <div className="min-h-screen bg-background">
      <BootOverlay show={boot} />

      {/* Main workspace */}
      <div
        className="container max-w-6xl mx-auto px-4 pb-10 pt-[calc(var(--nav-h,64px)+16px)]"
        style={{
          ['--nav-h' as any]: '64px',       // keep or compute dynamically
          ['--hdr-h' as any]: '0px',         // no header strip now
        }}
      >
        <section className="relative">
          {/* header + grid go inside here */}
          <div className={cn(
            "grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-var(--nav-h)-var(--hdr-h))]",
            isPortalMode && "bg-gradient-to-b from-[var(--briki-from)]/6 via-transparent to-[var(--briki-to)]/8"
          )}>
          {/* Left rail: results */}
          {!isPortalMode && (
            <motion.section 
              ref={briefSectionRef} 
              className={cn(
                (layoutMode === "analysis_prep") ? "hidden lg:block lg:col-span-1" : "lg:col-span-4",
                "space-y-4"
              )}
              style={(layoutMode === "analysis_prep") ? { width: 48 } : undefined}
              aria-hidden={(layoutMode === "analysis_prep") ? "true" : "false"}
              initial={false}
              animate={layoutMode === 'analysis_prep' ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
            >
            {layoutMode === "analysis_prep" ? (
              <IconRail />
            ) : (
              <>
            {/* Brief Card - Always visible */}
            <Card className="rounded-xl border bg-card overflow-hidden relative">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 sm:p-6">
                <CardTitle>Brief del cliente</CardTitle>
                {!brief && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!briefOpen) {
                        setUiPhase('collecting_brief');
                      } else {
                        setUiPhase('welcome');
                      }
                      setBriefOpen(!briefOpen);
                    }}
                  >
                    {briefOpen ? 'Cerrar' : 'Iniciar brief'}
                  </Button>
                )}
              </CardHeader>
              
              <AnimatePresence initial={false}>
                {briefOpen && !brief && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <form onSubmit={handleInlineBriefSubmit} className="p-4 space-y-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="category">Categoría de seguro</Label>
                        <Select
                          value={formData.category_code}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category_code: value as "auto" | "health" | "life" | "travel" }))}
                        >
                          <SelectTrigger id="category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Vehículos</SelectItem>
                            <SelectItem value="health">Salud</SelectItem>
                            <SelectItem value="life">Vida</SelectItem>
                            <SelectItem value="travel">Viajes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="budget">Presupuesto máximo (COP)</Label>
                        <Input
                          id="budget"
                          type="number"
                          placeholder="300000"
                          value={formData.budget_high}
                          onChange={(e) => setFormData(prev => ({ ...prev, budget_high: e.target.value }))}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Valor mensual máximo que el cliente está dispuesto a pagar
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="must_haves">Coberturas imprescindibles</Label>
                        <Input
                          id="must_haves"
                          placeholder="asistencia, vidrios, robo"
                          value={formData.must_haves}
                          onChange={(e) => setFormData(prev => ({ ...prev, must_haves: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Separa cada cobertura con comas
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 pt-2">
                        <Button type="submit" size="sm" className="w-full">
                          Buscar mejores opciones
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Show description when not editing */}
              {!briefOpen && !brief && (
                <CardContent className="p-5 sm:p-6 pt-0">
                  <p className="text-sm text-muted-foreground">
                    Comienza ingresando los detalles del seguro que busca tu cliente
                  </p>
                </CardContent>
              )}
            </Card>
            
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
                  setIsAnalyzerExpanded((v) => !v);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setAnalyzingPlan(null);
                    setIsAnalyzerExpanded((v) => !v);
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
              <Card className="rounded-xl border bg-card">
                <CardContent className="p-5 sm:p-6 py-12 text-center">
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
                        setBriefOpen(true);
                        telemetry.track(telemetry.events.EMPTY_STATE_CLICKED, { action: 'increase_budget' });
                      }}
                    >
                      Ampliar presupuesto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBriefOpen(true);
                        telemetry.track(telemetry.events.EMPTY_STATE_CLICKED, { action: 'fewer_requirements' });
                      }}
                    >
                      Menos requisitos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
              </>
            )}
            </motion.section>
          )}

          {/* Portal container */}
          {isPortalMode && (
            <motion.main className="col-span-12 lg:col-span-8" initial={false} animate={{ opacity: 1 }} transition={{ type:'spring', stiffness:240, damping:28 }}>
              {useUI.getState().layoutMode === 'analysis_running' ? (
                (() => {
                  const uid = (useAnalyzer.getState().uploadId || '') as string;
                  return uid ? <PortalRunning uploadId={uid} /> : <PortalPrep />;
                })()
              ) : (
                <PortalPrep />
              )}
            </motion.main>
          )}

          {/* Right rail: chat */}
          <motion.aside className={cn(
            isPortalMode
              ? "col-span-12 lg:col-span-4 lg:border-l lg:border-muted lg:pl-6 lg:bg-muted/5"
              : (layoutMode === "analysis_prep")
                ? "lg:col-span-11"
                : "lg:col-span-8"
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
              {/* Proposal CTA bar */}
              {selected.length > 0 && (
                <div className="px-4 py-2 border-b bg-muted/30 flex justify-end">
                  <Button
                    onClick={handleCreateProposal}
                    size="sm"
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Generar propuesta ({selected.length})
                  </Button>
                </div>
              )}
              <AIAssistantInterface
                mode="embedded"
                initialSeed={brief && shortlist.length ? { brief, shortlist } : null}
              />
            </motion.div>
          </motion.aside>
          </div>
        </section>
      </div>

      {/* Global Components */}
    </div>
  );
}