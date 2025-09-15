'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { Play } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function DemoTeaser() {
  const { t } = useTranslation();

  return (
    <section 
      id="demo" 
      className="relative py-12 lg:py-16"
      style={{ scrollMarginTop: 'calc(var(--nav-h,64px) + 24px)' }}
    >
      {/* Background with stronger gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-briki-50/50 to-briki-100/30 dark:from-briki-900/50 dark:to-briki-800/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.1)_100%)] dark:bg-[radial-gradient(circle_at_70%_60%,rgba(255,255,255,0)_0%,rgba(255,255,255,0.1)_100%)]" />
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto text-center px-6">
        {/* Play button */}
        <button
          type="button"
          className="mb-8 rounded-full w-20 h-20 flex items-center justify-center bg-white/80 dark:bg-white/10 backdrop-blur-sm shadow-lg border border-white/20 text-briki-600 dark:text-white hover:bg-white/90 dark:hover:bg-white/20 transition-colors mx-auto"
          aria-label={t('home.simple.demo_title')}
        >
          <Play className="w-10 h-10" />
        </button>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
          {t('home.simple.demo_title')}
        </h2>

        {/* Caption */}
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('home.simple.demo_caption')}
        </p>
      </div>
    </section>
  );
}
