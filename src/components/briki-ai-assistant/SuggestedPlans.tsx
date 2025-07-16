import React, { useEffect, useState } from 'react';
import NewPlanCard, { InsurancePlan } from './NewPlanCard';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface SuggestedPlansProps {
  title: string;
  plans: InsurancePlan[];
  onViewDetails: (planId: number) => void;
  onQuote: (planId: number) => void;
  onViewAllPlans?: () => void;
}

const SuggestedPlans: React.FC<SuggestedPlansProps> = ({
  title,
  plans,
  onViewDetails,
  onQuote,
  onViewAllPlans,
}) => {
  const { t } = useTranslation();
  const [showViewAll, setShowViewAll] = useState(false);

  useEffect(() => {
    if (plans && plans.length > 4) {
      setShowViewAll(true);
    }
  }, [plans]);

  // Filter out invalid plans
  const validPlans = plans.filter(plan => 
    plan && 
    plan.id && 
    plan.name && 
    plan.provider
  );

  if (!validPlans || validPlans.length === 0) {
    return (
      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('plans.notFound')}
      </div>
    );
  }

  const handleViewAllClick = () => {
    if (onViewAllPlans) {
      onViewAllPlans();
    }
  };

  return (
    <div className="mt-6 w-full max-w-full">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {validPlans.slice(0, 4).map((plan) => (
          <NewPlanCard
            key={plan.id}
            plan={plan}
            onViewDetails={() => onViewDetails(plan.id)}
            onQuote={() => onQuote(plan.id)}
          />
        ))}
      </div>
      {showViewAll && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAllClick}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t('plans.viewAllButton')} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SuggestedPlans; 