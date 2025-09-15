"use client";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface UILayoutState {
  // Brief panel collapse state
  isBriefCollapsed: boolean;
  briefManualOverride: "none" | "manual-open" | "manual-closed";

  // Actions
  setBriefCollapsed: (collapsed: boolean) => void;
  toggleBriefCollapsed: () => void;
  setBriefManualOpen: () => void;
  setBriefManualClosed: () => void;
  clearBriefManualOverride: () => void;
}

export const useUILayoutStore = create<UILayoutState>()((set, get) => ({
  isBriefCollapsed: false,
  briefManualOverride: "none",

  setBriefCollapsed: (collapsed: boolean) => {
    set({ isBriefCollapsed: collapsed });
  },

  toggleBriefCollapsed: () => {
    set({ isBriefCollapsed: !get().isBriefCollapsed });
  },

  setBriefManualOpen: () => {
    set({ briefManualOverride: "manual-open" });
  },

  setBriefManualClosed: () => {
    set({ briefManualOverride: "manual-closed" });
  },

  clearBriefManualOverride: () => {
    set({ briefManualOverride: "none" });
  },
}));

// Export selector hooks for convenience
export const useIsBriefCollapsed = () =>
  useUILayoutStore((state) => state.isBriefCollapsed);
// Tuple + shallow wrapper (TS-safe)
export const useUILayoutActions = () =>
  useUILayoutStore(useShallow(s => [s.setBriefCollapsed, s.toggleBriefCollapsed] as const));
