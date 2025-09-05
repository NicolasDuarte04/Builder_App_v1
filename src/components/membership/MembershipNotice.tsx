"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { useMembership } from '@/hooks/useMembership';
import { useTranslation } from '@/hooks/useTranslation';

interface MembershipNoticeProps {
  onViewMembership: () => void;
}

export function MembershipNotice({ onViewMembership }: MembershipNoticeProps) {
  const { tier, policyCount, limit, isPremium } = useMembership();
  const { t } = useTranslation();

  if (isPremium) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              Briki Plus activo — pólizas ilimitadas
            </span>
          </div>
          <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
            Plus
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">i</span>
          </div>
          <span className="text-sm text-blue-900 dark:text-blue-100">
            Puedes guardar hasta {limit} análisis de pólizas en el plan gratuito
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewMembership}
          className="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
        >
          {t('emptyState.viewMembership', 'Ver membresía')}
        </Button>
      </div>
    </div>
  );
}
