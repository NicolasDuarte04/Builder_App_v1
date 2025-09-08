"use client";
import { FileText, ClipboardList } from "lucide-react";

export default function IconRail() {
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
        onClick={() => window.dispatchEvent(new CustomEvent("briki:open-analyzer-panel"))}
      >
        <FileText className="h-5 w-5" />
      </button>
    </div>
  );
}
