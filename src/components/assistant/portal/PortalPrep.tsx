"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnalyzer } from "@/state/analyzer";
import { useUI } from "@/state/ui";
import { useTranslation } from "@/hooks/useTranslation";
import { telemetry } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import FocusAreaPill from "@/components/ui/FocusAreaPill";
import { 
  Shield, 
  AlertTriangle, 
  Globe, 
  Clock, 
  FileText, 
  Scale,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const startBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Mark prep phase and focus the primary CTA
    try { (require('@/state/ui') as any).useUI.getState().setUiPhase?.('prep'); } catch {}
    const btn = startBtnRef.current;
    if (btn) {
      btn.focus();
      try { telemetry.track(telemetry.events.A11Y_FOCUS_MOVED, { phase: 'prep', target: 'start_button' }); } catch {}
    } else {
      // Fallback to heading
      headingRef.current?.focus();
    }
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

  // Map focus areas to icons
  const getIconForFocusArea = (area: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      "exclusiones": <AlertTriangle className="h-4 w-4" />,
      "deducibles": <Scale className="h-4 w-4" />,
      "límites": <Shield className="h-4 w-4" />,
      "carencias": <Clock className="h-4 w-4" />,
      "cobertura internacional": <Globe className="h-4 w-4" />,
      "cláusulas específicas": <FileText className="h-4 w-4" />,
    };
    return iconMap[area] || null;
  };

  const ctaAnalyze = (() => {
    const v1 = t("portal.cta.start") as any;
    if (typeof v1 === "string" && v1.trim().length > 0) return v1;
    const raw = t("portal.cta_analyze") as any; // fallback to legacy key
    return typeof raw === "string" && raw.trim().length > 0 ? raw : "Start analysis";
  })();
  const cancelText = (() => {
    const legacy = t("portal.cta_change") as any; // keep legacy label semantics (Change PDF)
    return typeof legacy === "string" && legacy.trim().length > 0 ? legacy : (String((t as any)("portal.cta.cancel") || "Change PDF"));
  })();
  const focusLabel = (() => {
    const raw = t("portal.prep.focus_label") as any;
    return typeof raw === "string" && raw.trim().length > 0 ? raw : "Focus areas";
  })();
  const sidebarTitle = (() => {
    const raw = t("portal.sidebar.title") as any;
    return typeof raw === "string" && raw.trim().length > 0 ? raw : "Briki · Preparing analysis";
  })();
  const progressLabel = (() => {
    const raw = t("portal.sidebar.progress_label") as any;
    return typeof raw === "string" && raw.trim().length > 0 ? raw : "Ready";
  })();

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-neutral-950 dark:border-neutral-800 flex flex-col overflow-hidden h-[calc(100vh-var(--nav-h)-var(--hdr-h)-24px)] md:col-span-8"
      role="region"
      aria-label="Portal preparation controls"
    >
      <div className="p-4 md:p-6 space-y-4 overflow-auto flex-1">
        {/* File info */}
        <div className="flex items-center gap-2">
          {file ? (
            <>
              <span className="font-medium truncate" title={file.name}>
                {file.name}
              </span>
              <span className="text-sm text-muted-foreground flex-shrink-0 tabular-nums">
                {formatFileSize(file.size)}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t mt-3 pt-3">
          {/* Focus areas label */}
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {focusLabel}
          </div>

          {/* Focus chips */}
          <div className="flex flex-wrap gap-2">
            {Array.isArray(chipValues) && chipValues.length > 0
              ? chipValues.map((k) => {
                  const active = focusAreas.includes(k);
                  const ariaSelected = (() => {
                    const raw = (t as any)("portal.prep.pill.selected_aria", { label: k });
                    return typeof raw === "string" && raw.trim().length > 0 ? raw : `${k} seleccionado`;
                  })();
                  const ariaUnselected = (() => {
                    const raw = (t as any)("portal.prep.pill.unselected_aria", { label: k });
                    return typeof raw === "string" && raw.trim().length > 0 ? raw : `${k} no seleccionado`;
                  })();
                  return (
                    <FocusAreaPill
                      key={k}
                      label={k}
                      selected={active}
                      icon={getIconForFocusArea(k)}
                      ariaLabelSelectedKey={ariaSelected}
                      ariaLabelUnselectedKey={ariaUnselected}
                      onToggle={() => {
                        try {
                          if (active) {
                            telemetry.track(
                              telemetry.events.PREP_PILL_DESELECTED,
                              { label: k }
                            );
                          } else {
                            telemetry.track(
                              telemetry.events.PREP_PILL_SELECTED,
                              { label: k }
                            );
                          }
                          // Keep legacy event for backward compatibility
                          telemetry.track(
                            telemetry.events.ANALYZER_FOCUS_TOGGLED,
                            { key: k }
                          );
                        } catch {}
                        toggleFocusArea(k);
                      }}
                    />
                  );
                })
              : null}
          </div>

          {/* Instructions when no areas are selected */}
          {focusAreas.length === 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              {t("portal.prep.instructions")}
            </div>
          )}
        </div>

        {/* Prep note area */}
        <div className="bg-gray-50 dark:bg-neutral-950/60 rounded-xl border border-gray-200 dark:border-neutral-800 p-4 md:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {sidebarTitle}
            </h3>
            <div className="text-xs inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-gray-600 bg-white/60 border-gray-300">
              <Check className="h-3 w-3" />
              {progressLabel}
            </div>
          </div>
        </div>
      </div>
      
      {/* Pinned CTA section */}
      <div className="sticky bottom-0 bg-gradient-to-t from-card to-card/70 backdrop-blur-sm pt-3 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full md:w-auto"
            disabled={isStarting}
            ref={startBtnRef}
            aria-label={String((t as any)("portal.cta.start") || (t as any)("portal.cta_analyze") || "Start analysis")}
            title={String((t as any)("portal.cta.start") || (t as any)("portal.cta_analyze") || "Start analysis")}
            onClick={() => {
              setIsStarting(true);
              try {
                telemetry.track(telemetry.events.PREP_START_CLICKED, { selected: focusAreas });
                telemetry.track(telemetry.events.ANALYZER_START, {
                  focusCount: focusAreas.length,
                  notePresent: !!useAnalyzer.getState().note,
                });
                telemetry.track(telemetry.events.PORTAL_STARTED, {
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
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              try {
                telemetry.track(telemetry.events.PREP_CHANGE_PDF_CLICKED, {});
                telemetry.track(telemetry.events.ANALYZER_CANCELLED, {});
                telemetry.track(telemetry.events.ANALYSIS_ABORTED, { reason: 'prep_cancelled' });
              } catch {}
              useAnalyzer.getState().clear();
              useUI.getState().setLayoutMode("normal");
              try { (require('@/state/analyzerUI') as any).useAnalyzerUI.getState().open('sidebarCTA'); } catch {}
            }}
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </section>
  );
}


