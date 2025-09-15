"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ToolbarDensity = "compact" | "comfortable";

interface PrefsState {
  toolbarDensity: ToolbarDensity;
  setToolbarDensity: (d: ToolbarDensity) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      toolbarDensity: "comfortable",
      setToolbarDensity: (toolbarDensity) => set({ toolbarDensity }),
    }),
    {
      name: "briki-prefs-store",
    }
  )
);


