'use client';
import { useEffect, useRef, useState } from 'react';

export type AnalysisPhase = 'idle' | 'initializing' | 'extracting' | 'analyzing' | 'summarizing' | 'done' | 'error';

export function useAnalysisProgress() {
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [progress, setProgress] = useState(0);
  const optimisticTimer = useRef<number | null>(null);

  const startOptimistic = () => {
    // Smoothly crawl to 55% over ~6s
    const target = 55;
    const stepMs = 100;
    const step = () => {
      setProgress(p => {
        if (p >= target || phase === 'done' || phase === 'error') return p;
        return Math.min(target, p + 2);
      });
      optimisticTimer.current = window.setTimeout(step, stepMs);
    };
    step();
  };

  const stopOptimistic = () => {
    if (optimisticTimer.current) {
      clearTimeout(optimisticTimer.current);
      optimisticTimer.current = null;
    }
  };

  const bindServerPhase = (serverPhase: AnalysisPhase, serverProgress?: number) => {
    stopOptimistic();
    setPhase(serverPhase);
    
    if (serverProgress !== undefined) {
      setProgress(p => Math.max(p, serverProgress));
    } else {
      const map: Record<AnalysisPhase, number> = {
        idle: 0,
        initializing: 10,
        extracting: 30,
        analyzing: 60,
        summarizing: 90,
        done: 100,
        error: 100
      };
      setProgress(p => Math.max(p, map[serverPhase]));
    }
  };

  const reset = () => {
    stopOptimistic();
    setPhase('idle');
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (optimisticTimer.current) {
        clearTimeout(optimisticTimer.current);
      }
    };
  }, []);

  return { phase, progress, setPhase, setProgress, startOptimistic, stopOptimistic, bindServerPhase, reset };
}
