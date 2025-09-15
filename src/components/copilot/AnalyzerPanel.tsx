'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyzerCore } from './AnalyzerCore';

interface AnalyzerPanelProps {
  isExpanded: boolean;
  onToggle: (next: boolean) => void;
  plan?: any | null;
  onAnalysisComplete?: (payload: { analysisSummary: string }) => void;
}

export function AnalyzerPanel({ 
  isExpanded, 
  onToggle, 
  plan, 
  onAnalysisComplete 
}: AnalyzerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isExpanded && firstFocusableRef.current) {
      // Small delay to ensure the panel is rendered
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    }
  }, [isExpanded]);

  const handleAnalysisComplete = (payload: { analysisSummary: string }) => {
    onAnalysisComplete?.(payload);
    // Auto-collapse after successful analysis
    onToggle(false);
  };

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          ref={panelRef}
          id="analyzer-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="p-4 space-y-4 border-t bg-muted/20">
            <AnalyzerCore
              plan={plan}
              onAnalysisComplete={handleAnalysisComplete}
              variant="panel"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
