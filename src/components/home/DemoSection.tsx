'use client';

import { HeroVideoDialog } from '@/components/ui/hero-video-dialog';
import { useTranslation } from '@/hooks/useTranslation';

export function DemoSection() {
  const { t } = useTranslation();

  return (
    <section id="demo-section" className="w-full py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
              {t('home.simple.how_it_works_title')}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('home.simple.how_it_works_description')}
            </p>
          </div>
          
          <HeroVideoDialog
            animationStyle="from-center"
            videoSrc="https://www.youtube.com/embed/dQw4w9WgXcQ" // Placeholder - replace with actual demo video
            thumbnailSrc="/images/demo-thumbnail.jpg" // Placeholder - replace with actual thumbnail
            thumbnailAlt="Briki Demo Video"
            className="max-w-4xl mx-auto"
          />
        </div>
      </div>
    </section>
  );
}
