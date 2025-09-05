'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type MembershipModalProps = {
  /** Controlled open state (optional). If omitted, component is uncontrolled. */
  open?: boolean;
  /** Controlled state setter (optional). Required only if `open` is provided. */
  onOpenChange?: (open: boolean) => void;
  /** Optional: where the modal was opened from (analytics/UX) */
  source?: 'navbar' | 'insuranceEmpty' | 'limitHit' | 'unknown';
};

export default function MembershipModal(props: MembershipModalProps) {
  const { open, onOpenChange, source = 'unknown' } = props;

  // Uncontrolled fallback state
  const [internalOpen, setInternalOpen] = useState(false);

  // Single source of truth
  const isControlled = typeof open === 'boolean';
  const isOpen = isControlled ? (open as boolean) : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const t = useTranslations('membership');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    if (!session) {
      // Redirect to login, then return to modal
      router.push('/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }

    setIsUpgrading(true);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else if (response.status === 401) {
        router.push('/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href));
      } else {
        throw new Error('Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(t('errors.checkoutUnavailable'));
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleContinueFree = () => {
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent 
        className="max-w-4xl p-6 md:p-8 rounded-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free Plan Card */}
          <Card className="border-neutral-200 bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-700">
                  {t('free.title')}
                </CardTitle>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                  Current plan
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-400 mb-1">
                  {t('free.price')}
                </div>
                <p className="text-sm text-gray-500">
                  {t('free.limits')}
                </p>
              </div>
              
              <ul className="space-y-3">
                {t.raw('free.bullets').map((bullet: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 text-sm">{bullet}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Plus Plan Card */}
          <Card className="bg-gradient-to-b from-sky-50 to-white border-sky-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-cyan-400"></div>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-sky-700">
                {t('plus.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-extrabold text-sky-700 mb-1">
                  {t('plus.price')}
                </div>
                <p className="text-sm text-sky-600 mt-2">
                  Unlimited policy analyses
                </p>
              </div>
              
              <ul className="space-y-3">
                {t.raw('plus.bullets').map((bullet: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{bullet}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl mt-4"
              >
                {isUpgrading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    {t('plus.cta')}
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <Button
            variant="ghost"
            onClick={handleContinueFree}
            className="text-gray-600 hover:text-gray-800"
          >
            {t('cta.continueFree')}
          </Button>
          
          <p className="text-xs text-gray-500">
            {t('legal.cancelAnytime')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
