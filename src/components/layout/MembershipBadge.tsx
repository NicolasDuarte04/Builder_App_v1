'use client';

import { useState } from 'react';
import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';
import { useMembership } from '@/hooks/useMembership';
import MembershipModal from '@/components/membership/MembershipModal';

export default function MembershipBadge() {
  const t = useTranslations('membership');
  const { membership, policies, isLoading } = useMembership();
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
    );
  }

  const isPremium = membership?.isPremium || false;
  const policyCount = policies?.count || 0;
  const policyLimit = typeof policies?.limit === 'number' ? policies.limit : 4;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModal(true)}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={isPremium ? t('navbar.tooltip') : t('navbar.tooltip')}
            >
              {isPremium ? (
                <Crown className="w-5 h-5 text-yellow-500 fill-current" />
              ) : (
                <Crown className="w-5 h-5 text-gray-400" />
              )}
              
              {!isPremium && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {policyCount}/{policyLimit}
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-sm">
              {isPremium ? t('navbar.tooltip') : t('navbar.tooltip')}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <MembershipModal 
        open={showModal} 
        onOpenChange={setShowModal} 
      />
    </>
  );
}
