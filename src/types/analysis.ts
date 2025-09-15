export type NormalizedRect = [number, number, number, number]; // [x,y,w,h] in 0..1 (page space)

export interface AnalysisItem {
  id: string;
  title?: string;
  text: string;
  page?: number;             // 1-based
  rects?: NormalizedRect[];  // optional
}

export interface AnalysisSection {
  id: string;                // e.g., "limits", "exclusions"
  title: string;
  items: AnalysisItem[];
}

export interface PolicyAnalysisWithLocators {
  // keep existing PolicyAnalysis fields (extend, don't replace)
  policyType?: string;
  keyFeatures?: string[];
  // ...
  sections?: AnalysisSection[]; // NEW
  _pdfData?: { pdfUrl?: string; pageCount?: number };
}
