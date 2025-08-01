"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SuggestedPlans from '../briki-ai-assistant/SuggestedPlans';
import { InsurancePlan } from '../briki-ai-assistant/NewPlanCard';
import { PlanDetailsModal } from './PlanDetailsModal';
import { useToast } from '@/hooks/use-toast';

interface SuggestedPlansData {
  title: string;
  plans: InsurancePlan[];
}

interface InsurancePlansMessageProps {
  suggestedPlans: SuggestedPlansData;
  onViewAllPlans?: () => void;
}

export function InsurancePlansMessage({ 
  suggestedPlans, 
  onViewAllPlans 
}: InsurancePlansMessageProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'quote'>('details');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debug logging
  console.log('🎯 InsurancePlansMessage received:', {
    title: suggestedPlans.title,
    planCount: suggestedPlans.plans?.length || 0,
    plans: suggestedPlans.plans
  });

  // Handle view details action
  const handleViewDetails = (planId: number) => {
    console.log('🎯 View details clicked for plan:', planId);
    const plan = suggestedPlans.plans.find(p => p.id === planId);
    
    if (plan) {
      setSelectedPlan(plan);
      setModalMode('details');
      setIsModalOpen(true);
      
      toast({
        title: "Detalles del plan",
        description: `Viendo detalles de ${plan.name}`,
      });
    } else {
      console.warn('⚠️ Plan not found for ID:', planId);
    }
  };

  // Handle quote action
  const handleQuote = (planId: number) => {
    console.log('🎯 Quote clicked for plan:', planId);
    const plan = suggestedPlans.plans.find(p => p.id === planId);
    
    if (plan) {
      setSelectedPlan(plan);
      setModalMode('quote');
      setIsModalOpen(true);
      
      toast({
        title: "Cotización",
        description: `Cotizando ${plan.name}`,
      });
    } else {
      console.warn('⚠️ Plan not found for ID:', planId);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  // Validate suggestedPlans data structure
  if (!suggestedPlans || !suggestedPlans.plans || !Array.isArray(suggestedPlans.plans)) {
    console.warn('⚠️ Invalid suggestedPlans data:', suggestedPlans);
    return (
      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        No se pudieron cargar los planes de seguros.
      </div>
    );
  }

  // Handle empty plans array
  if (suggestedPlans.plans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full mt-4"
      >
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                No se encontraron planes disponibles
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Los criterios de búsqueda no coinciden con ningún plan en nuestra base de datos. 
                Intenta con diferentes parámetros.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <SuggestedPlans
          title={suggestedPlans.title}
          plans={suggestedPlans.plans}
          onViewDetails={handleViewDetails}
          onQuote={handleQuote}
          onViewAllPlans={onViewAllPlans}
        />
      </motion.div>
      
      <PlanDetailsModal
        plan={selectedPlan}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
      />
    </>
  );
} 