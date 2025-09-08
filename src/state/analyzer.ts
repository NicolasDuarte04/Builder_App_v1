"use client";
import { create } from "zustand";

type AnalyzerState = {
  file: File | null;
  previewUrl?: string;
  note: string;
  focusAreas: string[];
  uploadId?: string | null;
  statusSig?: string | null;
  abortController?: AbortController | null;
  setFile: (f: File | null) => void;
  setNote: (note: string) => void;
  toggleFocusArea: (key: string) => void;
  setUploadId: (id: string | null) => void;
  setStatusSig: (s: string | null) => void;
  setAbortController: (c: AbortController | null) => void;
  clear: () => void;
};

export const useAnalyzer = create<AnalyzerState>((set, get) => ({
  file: null,
  previewUrl: undefined,
  note: '',
  focusAreas: [],
  uploadId: null,
  statusSig: null,
  abortController: null,
  setFile: (f) => {
    const old = get().previewUrl;
    if (old) URL.revokeObjectURL(old);
    set(!f ? { file: null, previewUrl: undefined } : { file: f, previewUrl: URL.createObjectURL(f) });
  },
  setNote: (note) => set({ note }),
  toggleFocusArea: (key) => set((state) => {
    const exists = state.focusAreas.includes(key);
    return {
      focusAreas: exists
        ? state.focusAreas.filter((k) => k !== key)
        : [...state.focusAreas, key],
    } as Partial<AnalyzerState> as AnalyzerState;
  }),
  setUploadId: (id) => set({ uploadId: id }),
  setStatusSig: (s) => set({ statusSig: s }),
  setAbortController: (c) => set({ abortController: c }),
  clear: () => {
    const old = get().previewUrl;
    if (old) URL.revokeObjectURL(old);
    set({ file: null, previewUrl: undefined, note: '', focusAreas: [], uploadId: null, statusSig: null, abortController: null });
  },
}));
