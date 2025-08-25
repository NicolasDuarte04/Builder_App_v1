export type Money = { amount: number; currency: string; frequency?: 'monthly' | 'annual' | 'other' };

export type SavedPolicyAnalysis = {
  prima?: Money | null;
  limites_cobertura?: Array<{ label?: string; value?: string }> | null;
  deducibles?: Array<{ label?: string; value?: string }> | null;
  caracteristicas?: string[] | null; // “Características Principales”
  exclusiones?: string[] | null;
  evaluacion_riesgo?: { score?: number; notes?: string } | null;
  recomendaciones?: string[] | null;
  detalles_poliza?: string | null;
  senales_alerta?: string[] | null;
};

export type SavePolicyRequest = {
  fileUrl?: string | null;
  title?: string | null;
  analysis: SavedPolicyAnalysis;
  extractedRaw?: unknown;
  metadata?: {
    source?: 'analysis_modal' | string;
    premium?: number | null;
    currency?: string | null;
    frequency?: 'monthly' | 'annual' | 'other' | null;
    policy_number?: string | null;
  } | null;
};


