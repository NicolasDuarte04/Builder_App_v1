"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUI } from "@/state/ui";
import { useAnalyzer } from "@/state/analyzer";
import { telemetry } from "@/lib/telemetry";
import { useTranslation } from "@/hooks/useTranslation";
import { useAnalysisProgress } from "@/hooks/use-analysis-progress";
import { ProgressBar, StepDots, PhaseLabel } from "./ProgressBar";

type Props = { uploadId: string };

const STEPS = ["initializing","extracting","analyzing","summarizing","done"] as const;
type StepKey = typeof STEPS[number];

export default function PortalRunning({ uploadId }: Props) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();
  const { phase, progress, bindServerPhase, startOptimistic } = useAnalysisProgress();
  const [serverStatus, setServerStatus] = useState<"queued"|"extracting"|"analyzing"|"summarizing"|"done"|"error">("queued");
  const pollRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  // Start optimistic progress immediately on mount
  useEffect(() => {
    startOptimistic();
  }, [startOptimistic]);

  const labels = useMemo(() => ({
    initializing: String((t as any)("portal.running.initializing") || "Initializing"),
    extracting: String((t as any)("portal.running.extracting") || "Extracting"),
    analyzing: String((t as any)("portal.running.analyzing") || "Analyzing"),
    summarizing: String((t as any)("portal.running.summarizing") || "Summarizing"),
    done: String((t as any)("portal.running.done") || "Done"),
    cancel: String((t as any)("portal.running.cancel") || "Cancel"),
    aria: (status: string, p: number) => String((t as any)("portal.running.progress_aria") || "{status} {progress}%").replace("{status}", status).replace("{progress}", String(p)),
  }), [t]);

  useEffect(() => { headingRef.current?.focus(); }, []);

  useEffect(() => {
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent).detail as { uploadId: string; status: Props extends any ? any : never; progress: number };
      if (!detail || detail.uploadId !== uploadId) return;
      setServerStatus(detail.status);
      
      // Map server status to analysis phase
      const phaseMap: Record<string, any> = {
        'queued': 'initializing',
        'extracting': 'extracting',
        'analyzing': 'analyzing',
        'summarizing': 'summarizing',
        'done': 'done',
        'error': 'error'
      };
      
      const mappedPhase = phaseMap[detail.status] || 'analyzing';
      bindServerPhase(mappedPhase, detail.progress);

      // polite announcement
      const statusLabel = labels[mappedPhase as StepKey] || 'Running';
      const live = liveRef.current; 
      if (live) live.textContent = labels.aria(statusLabel, progress);
    };
    window.addEventListener('analysis:progress', onProgress);
    return () => window.removeEventListener('analysis:progress', onProgress);
  }, [uploadId, progress, labels, bindServerPhase]);

  useEffect(() => {
    // start polling loop here in case page mounted directly in running mode
    startPolling();
    const onCancel = () => {
      cancelRun();
    };
    window.addEventListener('briki:cancel-analysis', onCancel);
    return () => {
      stopPolling();
      window.removeEventListener('briki:cancel-analysis', onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling() {
    if (pollRef.current != null) return;
    pollRef.current = window.setInterval(async () => {
      try {
        const { statusSig } = useAnalyzer.getState() as any;
        const qs = new URLSearchParams({ uploadId: String(uploadId) });
        if (statusSig) qs.set('sig', String(statusSig));
        const res = await fetch(`/api/ai/analyze-policy/status?${qs.toString()}`, { cache: 'no-store' });
        if (!res.ok) {
          stopPolling();
          telemetry.track(telemetry.events.RUN_FAILED || 'run_failed', { uploadId, status: res.status });
          try { (await import('@/hooks/use-toast')).toast({ title: 'Error', description: `Status check failed (${res.status})`, variant: 'destructive' }); } catch {}
          useUI.getState().setLayoutMode('analysis_portal_prep');
          return;
        }
        const data = await res.json();
        const detail = { uploadId, status: data.status, progress: data.progress };
        window.dispatchEvent(new CustomEvent('analysis:progress', { detail }));
        try { telemetry.track(telemetry.events.RUN_PROGRESS || 'run_progress', detail as any); } catch {}
        if (data.status === 'done') {
          stopPolling();
          try { telemetry.track(telemetry.events.RUN_COMPLETED, { uploadId }); } catch {}
          useUI.getState().setLayoutMode('analysis_results');
        } else if (data.status === 'error') {
          stopPolling();
          try { (await import('@/hooks/use-toast')).toast({ title: 'Error', description: 'Analysis failed', variant: 'destructive' }); } catch {}
          useUI.getState().setLayoutMode('analysis_portal_prep');
        }
      } catch (e: any) {
        stopPolling();
        try { (await import('@/hooks/use-toast')).toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); } catch {}
        useUI.getState().setLayoutMode('analysis_portal_prep');
      }
    }, 1000); // Throttled to 1s instead of 1.2s
  }

  function stopPolling() {
    if (pollRef.current != null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }

  function cancelRun() {
    try { telemetry.track(telemetry.events.ANALYZER_CANCELLED, { uploadId }); } catch {}
    stopPolling();
    useAnalyzer.getState().setUploadId(null);
    useUI.getState().setLayoutMode('analysis_portal_prep');
  }

  return (
    <section className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden h-[calc(100vh-var(--nav-h)-var(--hdr-h)-24px)]" role="region" aria-label="Portal running">
      <div className="p-4 sm:p-5 space-y-4 overflow-auto flex-1">
        <h2 ref={headingRef} tabIndex={-1} className="text-sm font-medium">Analizando tu póliza</h2>
        <div className="sr-only" aria-live="polite" ref={liveRef}></div>
        
        {/* Progress bar with shimmer effect */}
        <div className="space-y-3">
          <ProgressBar value={progress} />
          <div className="flex items-center justify-between">
            <PhaseLabel phase={phase} />
            <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
          </div>
        </div>

        {/* Step dots */}
        <StepDots phase={phase} />
      </div>
      <div className="sticky bottom-0 bg-gradient-to-t from-card to-card/70 backdrop-blur-sm pt-3 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-sm font-medium underline hover:no-underline"
            onClick={() => { window.dispatchEvent(new CustomEvent('briki:cancel-analysis')); }}
          >
            {labels.cancel}
          </button>
        </div>
      </div>
    </section>
  );
}


