"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnalyzer } from "@/state/analyzer";
import { useUI } from "@/state/ui";
import { useTranslation } from "@/hooks/useTranslation";
import { telemetry } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

function formatFileSize(bytes?: number | null): string {
  const size = typeof bytes === "number" ? bytes : 0;
  if (size <= 0) return "";
  const kb = size / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

export default function PortalPrep() {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const { file, focusAreas, toggleFocusArea } = useAnalyzer();
  const { t } = useTranslation();
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Focus the heading on mount for accessibility
    headingRef.current?.focus();
  }, []);

  // Derive safe chip labels with fallback to defaults
  const chipValues = useMemo(() => {
    const chipValuesRaw = t("portal.chips") as any;
    return Array.isArray(chipValuesRaw)
      ? (chipValuesRaw as string[])
      : [
          "exclusiones",
          "deducibles",
          "límites",
          "carencias",
          "cobertura internacional",
          "cláusulas específicas",
        ];
  }, [t]);

  const ctaAnalyze = (() => {
    const raw = t("portal.cta_analyze") as any;
    return typeof raw === "string" && raw.trim().length > 0 ? raw : "Start analysis";
  })();
  const cancelText = (() => {
    const raw = t("portal.cta_change") as any;
    return typeof raw === "string" && raw.trim().length > 0 ? raw : "Change PDF";
  })();
  const focusLabel = (() => {
    const raw = t("portal.prep.focus_label") as any;
    return typeof raw === "string" && raw.trim().length > 0 ? raw : "Focus areas";
  })();

  return (
    <section
      className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden h-[calc(100vh-var(--nav-h)-var(--hdr-h)-24px)]"
      role="region"
      aria-label="Portal preparation controls"
    >
      <div className="p-4 sm:p-5 space-y-3 overflow-auto flex-1">
      {/* File info or empty state note */}
      <div className="text-sm text-muted-foreground">
        {file ? (
          <div className="inline-flex items-center px-2 py-1 rounded bg-muted truncate" title={file.name}>
            <span className="truncate">{file.name}</span>
            <span className="ml-1 flex-shrink-0 tabular-nums">· {formatFileSize(file.size)}</span>
          </div>
        ) : (
          <span className="inline-block px-2 py-1 rounded bg-muted/50">
            {/* small empty-state note when no file */}
            —
          </span>
        )}
      </div>

      {/* Focus areas label */}
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {focusLabel}
      </div>

      {/* Focus chips */}
      <div className="flex flex-wrap gap-2">
        {Array.isArray(chipValues) && chipValues.length > 0
          ? chipValues.map((k) => {
              const active = focusAreas.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  className={cn(
                    'inline-flex items-center rounded-md border px-2.5 py-1 text-xs transition hover:ring-1 hover:ring-muted',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    'data-[active=true]:bg-primary/10 data-[active=true]:border-primary data-[active=true]:text-primary',
                    !active && 'bg-muted border-transparent hover:bg-muted/80'
                  )}
                  onClick={() => {
                    try {
                      telemetry.track(
                        telemetry.events.ANALYZER_FOCUS_TOGGLED,
                        { key: k }
                      );
                    } catch {}
                    toggleFocusArea(k);
                  }}
                  aria-pressed={active}
                  data-active={active}
                >
                  {k}
                </button>
              );
            })
          : null}
      </div>

      </div>
      
      {/* Pinned CTA section */}
      <div className="sticky bottom-0 bg-gradient-to-t from-card to-card/70 backdrop-blur-sm pt-3 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
            disabled={isStarting}
            onClick={() => {
              setIsStarting(true);
              try {
                telemetry.track(telemetry.events.ANALYZER_START, {
                  focusCount: focusAreas.length,
                  notePresent: !!useAnalyzer.getState().note,
                });
              } catch {}
              window.dispatchEvent(
                new CustomEvent("briki:start-analysis", {
                  detail: { focus: focusAreas },
                })
              );
              // Re-enable after a short delay to prevent double-submits
              setTimeout(() => setIsStarting(false), 1200);
            }}
          >
            {ctaAnalyze}
          </button>

          <button
            type="button"
            className="text-sm font-medium underline hover:no-underline"
            onClick={() => {
              try {
                telemetry.track(telemetry.events.ANALYZER_CANCELLED, {});
              } catch {}
              useAnalyzer.getState().clear();
              useUI.getState().setLayoutMode("normal");
              try {
                window.dispatchEvent(new CustomEvent("briki:open-analyzer-panel"));
              } catch {}
            }}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </section>
  );
}


