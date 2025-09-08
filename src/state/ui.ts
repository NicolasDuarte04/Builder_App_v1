"use client";
import { create } from "zustand";

type LayoutMode =
  | "normal"
  | "analysis_prep"
  | "analysis_focus"
  | "analysis_portal_prep"
  | "analysis_running"
  | "analysis_results";

type UIState = {
  layoutMode: LayoutMode;
  setLayoutMode: (m: LayoutMode) => void;
};

export const useUI = create<UIState>((set) => ({
  layoutMode: "normal",
  setLayoutMode: (layoutMode) => set({ layoutMode }),
}));
