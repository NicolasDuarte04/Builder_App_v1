"use client";
import { useEffect, useRef, useState } from "react";
import { useAnalyzer } from "@/state/analyzer";
import { useUI } from "@/state/ui";
import { useUiPhase } from "@/state/proposal";
import { telemetry } from "@/lib/telemetry";
import { useTranslation } from "@/hooks/useTranslation";

type Payload = {
  fileName?: string;
  fileSize?: number;
};

export default function AnalysisPrepMessage({ payload }: { payload: Payload }) {
  const ctaRef = useRef<HTMLButtonElement>(null);
  const { file, focusAreas, toggleFocusArea } = useAnalyzer();
  const { t } = useTranslation();
  const [isStarting, setIsStarting] = useState(false);
  const uiPhase = useUiPhase();
  const isBusy = uiPhase === 'analyzing_pdf' || uiPhase === 'processing';
  useEffect(() => { ctaRef.current?.focus(); }, []);

  // Guard array translations to avoid runtime crashes if a key resolves to a string
  const rawBullets = t('assistant.analysis_prep.bullets') as unknown;
  const bullets: string[] = Array.isArray(rawBullets) ? (rawBullets as string[]) : [];
  const rawChips = t('assistant.analysis_prep.chips') as unknown;
  const chips: string[] = Array.isArray(rawChips) ? (rawChips as string[]) : [];

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {(payload.fileName ?? file?.name) && (
          <div className="mb-2">
            <span className="px-2 py-1 rounded bg-muted">
              {(payload.fileName ?? file?.name)} · {Math.round(((payload.fileSize ?? file?.size ?? 0) / 1024))} KB
            </span>
          </div>
        )}
        <p className="font-medium">{String(t('assistant.analysis_prep.title'))}</p>
        <ul className="list-disc ml-5">
          {bullets.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((k) => (
          <button key={k}
            className={`text-xs px-2 py-1 rounded border ${focusAreas.includes(k) ? "bg-primary text-primary-foreground" : "bg-card"}`}
            onClick={() => {
              const active = !focusAreas.includes(k);
              try { telemetry.track(telemetry.events.ANALYZER_FOCUS_TOGGLED || 'analyzer_focus_toggled', { key: k, active }); } catch {}
              toggleFocusArea(k);
            }}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button ref={ctaRef}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isStarting || isBusy}
          onClick={() => {
            // Step 2 will start analysis; for now we just flip phase and keep layout
            setIsStarting(true);
            try { telemetry.track(telemetry.events.ANALYZER_START || 'analyzer_start', { fileSize: file?.size, focusCount: focusAreas.length, notePresent: !!useAnalyzer.getState().note }); } catch {}
            window.dispatchEvent(new CustomEvent("briki:start-analysis", { detail: { focus: focusAreas } }));
          }}
        >
          {isStarting ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-3 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              {t('assistant.analysis_prep.cta_analyze')}
            </span>
          ) : t('assistant.analysis_prep.cta_analyze')}
        </button>

        <button className="text-sm underline hover:no-underline"
          onClick={() => {
            useAnalyzer.getState().clear();
            useUI.getState().setLayoutMode("normal");
            try { (require('@/state/analyzerUI') as any).useAnalyzerUI.getState().open('sidebarCTA'); } catch {}
          }}
        >
          {t('assistant.analysis_prep.cta_change')}
        </button>
      </div>
    </div>
  );
}
