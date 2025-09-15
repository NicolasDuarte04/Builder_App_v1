'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { telemetry } from '@/lib/telemetry';
import { CheckCircle2 } from 'lucide-react';

export function HomeHelp() {
  const { t } = useTranslation();

  const handleTutorialClick = () => {
    telemetry.track(telemetry.events.HOME_CTA_TUTORIAL_CLICKED);
  };

  return (
    <Card className="rounded-xl border shadow-sm dark:bg-neutral-950 dark:border-neutral-800">
      <CardHeader className="p-5">
        <CardTitle>{t('home.why.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <ul className="flex flex-col items-start space-y-2">
          {(t('home.why.bullets') as string[]).map((bullet, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-briki-500 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{bullet}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={handleTutorialClick}
          className="mt-6 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-briki-500 focus-visible:ring-offset-2 ring-offset-background"
          aria-label="Watch tutorial - Learn how to use Briki effectively"
          tabIndex={2}
        >
          {t('home.why.tutorial')}
        </button>
      </CardContent>
    </Card>
  );
}
