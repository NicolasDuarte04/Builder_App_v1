"use client";
import { create } from "zustand";

type AnalyzerState = {
  file: File | null;
  previewUrl?: string;
  note: string;
  focusAreas: string[];
  uploadId?: string | null;
  statusSig?: string | null;
  lastErrorReason?: string | null;
  abortController?: AbortController | null;
  uploadStatus: 'idle' | 'uploading' | 'completed' | 'error';
  uploadProgress: number;
  uploadError: string | null;
  setFile: (f: File | null) => void;
  setNote: (note: string) => void;
  toggleFocusArea: (key: string) => void;
  setUploadId: (id: string | null) => void;
  setStatusSig: (s: string | null) => void;
  setLastErrorReason?: (r: string | null) => void;
  setAbortController: (c: AbortController | null) => void;
  retryUpload: () => void;
  cancelUpload: () => void;
  clear: () => void;
};

export const useAnalyzer = create<AnalyzerState>((set, get) => ({
  file: null,
  previewUrl: undefined,
  note: '',
  focusAreas: [],
  uploadId: null,
  statusSig: null,
  lastErrorReason: null,
  abortController: null,
  uploadStatus: 'idle',
  uploadProgress: 0,
  uploadError: null,
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
  setLastErrorReason: (r) => set({ lastErrorReason: r }),
  setAbortController: (c) => set({ abortController: c }),
  clear: () => {
    const old = get().previewUrl;
    if (old) URL.revokeObjectURL(old);
    set({ 
      file: null, 
      previewUrl: undefined, 
      note: '', 
      focusAreas: [], 
      uploadId: null, 
      statusSig: null, 
      lastErrorReason: null, 
      abortController: null,
      uploadStatus: 'idle',
      uploadProgress: 0,
      uploadError: null
    });
  },
  retryUpload: () => {
    const { file } = get();
    if (!file) return;
    
    // Reset upload state
    set({ 
      uploadStatus: 'idle',
      uploadProgress: 0,
      uploadError: null
    });
    
    // Re-trigger upload by dispatching event
    window.dispatchEvent(new CustomEvent("briki:analysis-prep", {
      detail: { name: file.name, size: file.size }
    }));
  },
  cancelUpload: () => {
    // Cancel any in-progress upload
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    
    // Reset state
    set({
      uploadStatus: 'idle',
      uploadProgress: 0,
      uploadError: null,
      file: null,
      previewUrl: undefined,
      uploadId: null,
      statusSig: null,
      lastErrorReason: null,
      abortController: null
    });
  }
}));
