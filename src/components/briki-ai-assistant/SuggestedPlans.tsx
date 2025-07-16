import React, { useEffect, useState } from 'react';
import NewPlanCard from './NewPlanCard';
import { useToast } from '@/hooks/use-toast';
import { InsurancePlan } from './NewPlanCard';
import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';

interface SuggestedPlansProps {
  plans: InsurancePlan[];
  category?: string;
  onViewAllPlans?: () => void;
}

const SuggestedPlans: React.FC<SuggestedPlansProps> = ({ 
  plans, 
  category, 
  onViewAllPlans 
}) => {
  const { toast } = useToast();
  const [showViewAll, setShowViewAll] = useState(false);

  useEffect(() => {
    if (plans && plans.length > 0) {
      // Show "View All" button if there are more than 4 plans and category is specified
      setShowViewAll(plans.length >= 4 && !!category);
    }
  }, [plans, category]);

  // Debug logging for plan rendering
  console.log('🎯 SuggestedPlans - Component rendered with:', {
    receivedPlans: !!plans,
    planCount: plans?.length || 0,
    planDetails: plans?.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      provider: p.provider,
      basePrice: p.basePrice,
      currency: p.currency,
      hasBenefits: Array.isArray(p.benefits),
      benefitsCount: p.benefits?.length || 0,
      isExternal: p.isExternal,
      externalLink: p.externalLink
    })) || []
  });

  // Si no hay planes, no renderizar nada
  if (!plans || plans.length === 0) {
    console.log('❌ SuggestedPlans - No plans to render');
    return null;
  }

  // Additional debug before rendering
  console.log('✅ SuggestedPlans - About to render plans:', {
    totalPlans: plans.length,
    firstPlan: plans[0],
    allPlanNames: plans.map(p => p.name)
  });

  const handleViewDetails = (planId: number) => {
    console.log('👆 View details clicked:', { planId });
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      // For now, just show a toast
      toast({
        title: "Detalles del plan",
        description: `Viendo detalles del plan ${plan?.name || planId}`,
      });
    }
  };

  const handleQuote = (planId: number) => {
    console.log('🎯 Quote clicked:', { planId });
    const plan = plans.find(p => p.id === planId);
    
    if (plan) {
      // Check if plan is external
      if (plan.isExternal && plan.externalLink) {
        // External plans open in new tab
        window.open(plan.externalLink, '_blank', 'noopener,noreferrer');
        
        toast({
          title: "Redirigiendo",
          description: `Abriendo sitio de ${plan.provider}`,
        });
      } else {
        // Internal flow - just show toast for now
        toast({
          title: "Iniciando cotización",
          description: `Cotizando ${plan.name} de ${plan.provider}`,
        });
      }
    } else {
      toast({
        title: "Error",
        description: "No se pudo encontrar el plan seleccionado",
        variant: "destructive"
      });
    }
  };

  const handleViewAllPlans = () => {
    if (onViewAllPlans) {
      onViewAllPlans();
    } else if (category) {
      toast({
        title: "Mostrando todos los planes",
        description: `Viendo todos los planes de ${category}`,
      });
    }
  };

  return (
    <div className="mt-3 mb-2">
      <div className="text-sm font-medium mb-2">Planes recomendados:</div>
      {/* Vertical stacked container */}
      <div className="w-full space-y-4">
        {plans.map((plan, index) => {
          console.log('📦 Rendering plan card:', {
            planId: plan.id,
            planName: plan.name,
            isHighlighted: index === 0,
            isExternal: plan.isExternal
          });

          return (
            <NewPlanCard
              key={plan.id}
              plan={plan}
              onViewDetails={handleViewDetails}
              onQuote={handleQuote}
            />
          );
        })}
      </div>
      
      {/* View All Plans Button */}
      {showViewAll && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleViewAllPlans}
            className="group"
          >
            Ver todos los planes
            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SuggestedPlans; 