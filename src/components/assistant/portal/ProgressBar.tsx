'use client';
import { motion } from 'framer-motion';
import type { AnalysisPhase } from '@/hooks/use-analysis-progress';

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="relative w-full h-2 rounded-full bg-gray-200 overflow-hidden">
      <motion.div
        className="absolute inset-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
      />
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 h-full opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          backgroundSize: '200% 100%'
        }}
        animate={{
          backgroundPosition: ['200% 0', '-200% 0']
        }}
        transition={{
          duration: 1.5,
          ease: 'linear',
          repeat: Infinity
        }}
      />
    </div>
  );
}

export function StepDots({ phase }: { phase: AnalysisPhase }) {
  const steps: AnalysisPhase[] = ['initializing', 'extracting', 'analyzing', 'summarizing', 'done'];
  const currentIndex = steps.indexOf(phase);
  
  return (
    <div className="flex gap-3 mt-4">
      {steps.map((s, idx) => {
        const isActive = idx <= currentIndex;
        const isCurrent = idx === currentIndex && phase !== 'error' && phase !== 'idle';
        
        return (
          <motion.div
            key={s}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              isActive ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            animate={isCurrent ? {
              scale: [1, 1.3, 1],
              opacity: [1, 0.7, 1]
            } : {
              scale: 1,
              opacity: 1
            }}
            transition={isCurrent ? {
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut'
            } : {}}
          />
        );
      })}
    </div>
  );
}

export function PhaseLabel({ phase }: { phase: AnalysisPhase }) {
  const labels: Record<AnalysisPhase, string> = {
    idle: 'Preparando...',
    initializing: 'Iniciando análisis...',
    extracting: 'Extrayendo texto del PDF...',
    analyzing: 'Analizando cláusulas y coberturas...',
    summarizing: 'Generando resumen ejecutivo...',
    done: '¡Análisis completado!',
    error: 'Error en el análisis'
  };

  return (
    <motion.p
      className="text-sm text-gray-600 mt-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={phase}
    >
      {labels[phase]}
      {phase !== 'done' && phase !== 'error' && phase !== 'idle' && (
        <span className="text-gray-400 ml-2">(~30-40s típico)</span>
      )}
    </motion.p>
  );
}
