import { create } from 'zustand';
import { telemetry } from '@/lib/telemetry';

export type Brief = { 
  category_code: 'auto' | 'health' | 'life' | 'travel'; 
  budget_high: number; 
  must_haves: string[] 
};

export type UiPhase = 'welcome' | 'collecting_brief' | 'analyzing_pdf' | 'processing' | 'results';

export type Plan = { 
  id: string; 
  name_es: string; 
  insurers: { name: string }; 
  plan_pricing: any[]; 
  plan_benefits: any[]; 
  source_url?: string; 
  last_verified_at?: string; 
  analysis?: any 
};

interface ProposalState {
  brief: Brief | null;
  shortlist: Plan[];
  selected: Plan[];
  uiPhase: UiPhase;
  setBrief: (b: Brief) => void;
  setShortlist: (p: Plan[]) => void;
  toggleSelect: (p: Plan) => void;
  attachAnalysis: (planId: string, analysis: any) => void;
  setUiPhase: (p: UiPhase) => void;
  clear: () => void;
  isSelected: (planId: string) => boolean;
}

export const useProposal = create<ProposalState>((set, get) => ({
  brief: null,
  shortlist: [],
  selected: [],
  uiPhase: 'welcome',
  
  setBrief: (b) => set({ brief: b }),
  
  setUiPhase: (uiPhase) => set({ uiPhase }),
  
  setShortlist: (p) => {
    set({ shortlist: p });
    telemetry.track(telemetry.events.SHORTLIST_LOADED, {
      planCount: p.length,
      category: get().brief?.category_code,
    });
  },
  
  toggleSelect: (plan) => {
    const { selected } = get();
    const exists = selected.find(p => p.id === plan.id);
    
    if (exists) {
      set({ selected: selected.filter(p => p.id !== plan.id) });
      telemetry.track(telemetry.events.PLAN_DESELECTED, {
        planId: plan.id,
        planName: plan.name_es,
      });
    } else {
      set({ selected: [...selected, plan] });
      telemetry.track(telemetry.events.PLAN_SELECTED, {
        planId: plan.id,
        planName: plan.name_es,
      });
    }
  },
  
  attachAnalysis: (planId, analysis) => {
    set(state => ({
      shortlist: state.shortlist.map(p => 
        p.id === planId ? { ...p, analysis } : p
      ),
      selected: state.selected.map(p => 
        p.id === planId ? { ...p, analysis } : p
      ),
    }));
    telemetry.track(telemetry.events.ANALYZER_COMPLETED, {
      planId,
      hasFindings: !!analysis,
    });
  },
  
  clear: () => set({ brief: null, shortlist: [], selected: [], uiPhase: 'welcome' }),
  
  isSelected: (planId) => get().selected.some(p => p.id === planId),
}));

// Optional selector helper for clean consumption
export const useUiPhase = () => useProposal((s) => s.uiPhase);
