'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyzerCore } from './copilot/AnalyzerCore';
import { useProposal } from '@/state/proposal';
import { telemetry } from '@/lib/telemetry';

interface AnalyzerPanelProps {
  isExpanded: boolean;
  onToggle: (next: boolean) => void;
  plan?: any | null;
  onAnalysisComplete?: (payload: { analysisSummary: string; analysis?: any }) => void;
}

export function AnalyzerPanel({ 
  isExpanded, 
  onToggle, 
  plan, 
  onAnalysisComplete 
}: AnalyzerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const { setUiPhase } = useProposal();

  // Focus management
  useEffect(() => {
    if (isExpanded && firstFocusableRef.current) {
      // Small delay to ensure the panel is rendered
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    }
  }, [isExpanded]);

  // Telemetry
  useEffect(() => {
    if (isExpanded) {
      telemetry.track(telemetry.events.ANALYZER_PANEL_OPENED, {
        hasPlan: !!plan,
        planId: plan?.id
      });
    } else {
      telemetry.track(telemetry.events.ANALYZER_PANEL_CLOSED);
    }
  }, [isExpanded, plan]);

  const handleAnalysisComplete = (payload: { analysisSummary: string }) => {
    // Set phase to results
    setUiPhase('results');
    
    // Track completion
    telemetry.track(telemetry.events.ANALYZER_COMPLETED, {
      hasPlan: !!plan,
      planId: plan?.id,
      hasSummary: !!payload.analysisSummary
    });
    
    onAnalysisComplete?.(payload);
    // Auto-collapse after successful analysis
    onToggle(false);
  };

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          ref={panelRef}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
          id="analyzer-panel"
          aria-labelledby="analyzer-panel-title"
        >
          <div className="p-4 space-y-4 border-t bg-muted/20">
            <h3 id="analyzer-panel-title" className="sr-only">
              Analizador de Póliza PDF
            </h3>
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