"use client";
import { FileText, ClipboardList } from "lucide-react";
import { useAnalyzerUI } from "@/state/analyzerUI";

export default function IconRail() {
  const openAnalyzer = useAnalyzerUI((s) => s.open);
  return (
    <div className="sticky top-4 flex flex-col items-center gap-4 py-4 border-r bg-card">
      <button 
        title="Brief" 
        aria-label="Abrir brief"
        className="p-2 rounded-lg hover:bg-muted" 
        onClick={() => window.dispatchEvent(new CustomEvent("briki:open-brief"))}
      >
        <ClipboardList className="h-5 w-5" />
      </button>
      <button 
        title="Analizar PDF" 
        aria-label="Abrir analizador de PDF"
        className="p-2 rounded-lg hover:bg-muted" 
        onClick={() => openAnalyzer('sidebarCTA')}
      >
        <FileText className="h-5 w-5" />
      </button>
    </div>
  );
}
