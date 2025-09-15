"use client";
import { create } from "zustand";
import { telemetry } from "@/lib/telemetry";

export type AnalyzerOpenSource = "quickAction" | "sidebarCTA" | "dropzoneCTA";

interface AnalyzerUIState {
  isOpen: boolean;
  lastOpenSource?: AnalyzerOpenSource | null;
  open: (source: AnalyzerOpenSource) => void;
  setOpen: (next: boolean) => void;
  toggle: () => void;
}

const ALLOWED_SOURCES: AnalyzerOpenSource[] = [
  "quickAction",
  "sidebarCTA",
  "dropzoneCTA",
];

export const useAnalyzerUI = create<AnalyzerUIState>((set, get) => ({
  isOpen: false,
  lastOpenSource: null,
  open: (source) => {
    // Gate by allowed sources only
    if (!ALLOWED_SOURCES.includes(source)) {
      if (process.env.NODE_ENV === "development") {
        // QA hook: blocked open attempt
        console.log("[ANALYZER] blocked: unknown source", source);
      }
      return;
    }
    set({ isOpen: true, lastOpenSource: source });
    try {
      telemetry.track(telemetry.events.ANALYZER_OPENED || "analyzer_opened", {
        source,
      });
    } catch {}
    if (process.env.NODE_ENV === "development") {
      // QA hook: single log on explicit open
      console.log(`[ANALYZER] open via ${source}`);
    }
  },
  setOpen: (next) => set({ isOpen: next }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

export const isValidAnalyzerSource = (v: unknown): v is AnalyzerOpenSource => {
  return typeof v === "string" && (ALLOWED_SOURCES as string[]).includes(v);
};


