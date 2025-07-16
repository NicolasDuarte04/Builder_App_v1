"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SuggestedPlans from '../briki-ai-assistant/SuggestedPlans';
import { InsurancePlan } from '../briki-ai-assistant/NewPlanCard';
import { PlanDetailsModal } from './PlanDetailsModal';
import { useToast } from '@/hooks/use-toast';

interface InsurancePlansMessageProps {
  plans: InsurancePlan[];
  category?: string;
  onViewAllPlans?: () => void;
}

export function InsurancePlansMessage({ 
  plans, 
  category,
  onViewAllPlans 
}: InsurancePlansMessageProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'quote'>('details');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle view details action
  const handleViewDetails = (planId: number) => {
    console.log('👆 View details clicked:', { planId });
    const plan = plans.find(p => p.id === planId);
    
    if (plan) {
      setSelectedPlan(plan);
      setModalMode('details');
      setIsModalOpen(true);
      
      toast({
        title: "Detalles del plan",
        description: `Viendo detalles de ${plan.name}`,
      });
    }
  };

  // Handle quote action
  const handleQuote = (planId: number) => {
    console.log('🎯 Quote clicked:', { planId });
    const plan = plans.find(p => p.id === planId);
    
    if (plan) {
      setSelectedPlan(plan);
      setModalMode('quote');
      setIsModalOpen(true);
      
      toast({
        title: "Cotización",
        description: `Cotizando ${plan.name}`,
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <SuggestedPlans
          plans={plans}
          category={category}
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