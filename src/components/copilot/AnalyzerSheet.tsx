'use client';
// DEPRECATED: This component is no longer used. Analyzer now uses in-card panel.
// Keeping for reference but should be removed in future cleanup.

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AnalyzerCore } from './AnalyzerCore';

interface AnalyzerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: any | null;
  onAnalysisComplete?: (payload: { analysisSummary: string }) => void;
}

export function AnalyzerSheet({ open, onOpenChange, plan, onAnalysisComplete }: AnalyzerSheetProps) {
  const handleAnalysisComplete = (payload: { analysisSummary: string }) => {
    onAnalysisComplete?.(payload);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-4xl sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {plan ? `Analizar ${plan.name_es ?? 'Póliza'}` : 'Analizar Póliza PDF'}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <AnalyzerCore
            plan={plan}
            onAnalysisComplete={handleAnalysisComplete}
            variant="sheet"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}