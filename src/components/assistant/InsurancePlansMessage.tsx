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

  // Validate suggestedPlans data
  if (!suggestedPlans || !suggestedPlans.plans || !Array.isArray(suggestedPlans.plans)) {
    console.warn('⚠️ Invalid suggestedPlans data:', suggestedPlans);
    return (
      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        No se pudieron cargar los planes de seguros.
      </div>
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