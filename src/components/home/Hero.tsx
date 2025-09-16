'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { telemetry } from '@/lib/telemetry';

export function Hero() {
  const { t } = useTranslation();
  const InviteCodeModal = dynamic(() => import('@/components/gate/InviteCodeModal'), { ssr: false });
  const gateEnabled = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_TRIAL_GATE_ENABLED === '1';
  const [open, setOpen] = useState(false);

  const handleGetStarted = () => {
    telemetry.track(telemetry.events.HOME_CTA_GET_STARTED_CLICKED, { source: 'hero' });
    if (gateEnabled) {
      setOpen(true);
    } else {
      window.location.href = '/assistant';
    }
  };

  return (
    <section className="relative">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-briki-50/30 to-briki-100/20 dark:from-neutral-950 dark:via-briki-900/30 dark:to-briki-800/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.1)_100%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0)_0%,rgba(255,255,255,0.1)_100%)]" />
      </div>

      {/* Content grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 px-6 py-16 sm:px-8 sm:py-20 lg:py-24">
        {/* Left column */}
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <span 
            className="inline-block text-sm font-semibold text-briki-600 dark:text-briki-400 uppercase tracking-wide mb-6" 
            aria-hidden="true"
          >
            {t('home.simple.eyebrow')}
          </span>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
            {t('home.simple.headline')}
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            {t('home.simple.subhead')}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Button
              variant="primary"
              size="lg"
              onClick={handleGetStarted}
              className="w-full sm:w-auto text-lg px-8 py-6 h-auto font-medium"
            >
              {t('home.simple.cta')}
            </Button>

            <a
              href="#demo"
              className="text-base text-muted-foreground hover:text-briki-500 transition-colors font-medium"
              style={{ scrollMarginTop: 'calc(var(--nav-h,64px) + 24px)' }}
            >
              {t('home.simple.see_how')}
            </a>
          </div>
        </div>

        {/* Right column - intentionally empty for visual balance */}
        <div className="hidden lg:block" />
      </div>
      {gateEnabled ? (
        // Keep modal mounted to preserve input
        <InviteCodeModal open={open} onOpenChange={setOpen} source="landing" />
      ) : null}
    </section>
  );
}
