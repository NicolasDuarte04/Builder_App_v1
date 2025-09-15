export type BriefSource = 'paste'|'upload'|'manual'|'url';

export interface Brief {
  id: string; 
  userId: string; 
  sessionId: string;
  clientId?: string; // Added for RLS support
  locale: 'es'|'en'; 
  source: BriefSource;
  category: 'Vehículos'|'Salud'|'Viajes'|'Vida'|'Hogar'|'Otro'|null;
  maxBudgetCop: number|null;
  mustHaveCoverages: string[];
  exclusions?: string[];
  clientPersona?: string;
  notes?: string;
  rawText?: string;
  docRefs?: { type:'pdf'|'url'|'text'; ref:string; title?:string; extractedAt?:string }[];
  createdAt: string; 
  updatedAt: string; 
  version: number;
  isApplied: boolean;
}

// Compatibility aliases for existing types
export type ProposalBrief = { 
  category_code: 'auto' | 'health' | 'life' | 'travel'; 
  budget_high: number; 
  must_haves: string[] 
};
