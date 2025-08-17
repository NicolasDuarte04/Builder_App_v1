import { create } from 'zustand';

export type ResultsState = 'open' | 'minimized' | 'hidden';

interface UIOverlayState {
  resultsState: ResultsState;
  prevResultsState?: ResultsState;
  analyzeModalOpen: boolean;
  openResults: () => void;
  minimizeResults: () => void;
  hideResults: () => void;
  openAnalyzeModal: () => void;
  closeAnalyzeModal: () => void;
}

export const useUIOverlay = create<UIOverlayState>((set, get) => ({
  resultsState: 'hidden',
  prevResultsState: undefined,
  analyzeModalOpen: false,

  openResults: () => set({ resultsState: 'open' }),
  minimizeResults: () => set({ resultsState: 'minimized' }),
  hideResults: () => set({ resultsState: 'hidden' }),

  openAnalyzeModal: () => {
    const { resultsState } = get();
    set({ prevResultsState: resultsState, resultsState: 'minimized', analyzeModalOpen: true });
  },
  closeAnalyzeModal: () => {
    const { prevResultsState } = get();
    set({ analyzeModalOpen: false, resultsState: prevResultsState ?? 'open', prevResultsState: undefined });
  },
}));


