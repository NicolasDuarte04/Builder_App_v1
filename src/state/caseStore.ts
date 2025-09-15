"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CaseFile } from "@/types/case";

interface CaseStoreState {
  caseFile: CaseFile | null;
  
  // actions
  createFromBrief: (userId: string, briefId: string) => Promise<void>; // TODO: wire in step-2b
  loadById: (caseId: string) => Promise<void>;                         // TODO
  setStatus: (status: CaseFile['status']) => void;
  clearCase: () => void;
}

const initialState = {
  caseFile: null,
};

export const useCaseStore = create<CaseStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      createFromBrief: async (userId: string, briefId: string) => {
        // TODO: wire in step-2b - implement case creation from brief
        console.log('TODO: createFromBrief', { userId, briefId });
        
        try {
          // TODO: Make server call to create case from brief
          // For now, create a mock case file
          const mockCaseFile: CaseFile = {
            id: `case-${Date.now()}`,
            userId,
            caseId: `case-${Date.now()}`,
            briefId,
            status: 'active',
            timeline: [
              {
                at: new Date().toISOString(),
                event: 'case_created',
                meta: { source: 'brief', briefId }
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set({ caseFile: mockCaseFile });
        } catch (error) {
          console.error('Failed to create case from brief:', error);
          throw error;
        }
      },

      loadById: async (caseId: string) => {
        // TODO: implement case loading by ID
        console.log('TODO: loadById', { caseId });
        
        try {
          // TODO: Make server call to load case by ID
          // For now, return early
          console.log('Case loading not yet implemented');
        } catch (error) {
          console.error('Failed to load case:', error);
          throw error;
        }
      },

      setStatus: (status: CaseFile['status']) => {
        const state = get();
        if (!state.caseFile) return;

        const updatedCaseFile: CaseFile = {
          ...state.caseFile,
          status,
          timeline: [
            ...state.caseFile.timeline,
            {
              at: new Date().toISOString(),
              event: 'status_changed',
              meta: { newStatus: status, previousStatus: state.caseFile.status }
            }
          ],
          updatedAt: new Date().toISOString(),
        };

        set({ caseFile: updatedCaseFile });
      },

      clearCase: () => {
        set(initialState);
      },
    }),
    {
      name: 'briki-case-store',
      skipHydration: true,
    }
  )
);
