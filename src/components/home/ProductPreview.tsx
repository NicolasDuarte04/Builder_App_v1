'use client';

import { useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { telemetry } from '@/lib/telemetry';
import { Play, FileText, BarChart3, Users } from 'lucide-react';

export function ProductPreview() {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePlayClick = () => {
    setIsPlaying(true);
    telemetry.track('home_demo_played');
  };

  return (
    <div 
      ref={containerRef}
      className="rounded-xl border shadow-sm overflow-hidden bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-neutral-900/50 dark:to-neutral-800/50"
      tabIndex={-1}
    >
      <div className="aspect-video relative">
        {!isPlaying ? (
          <>
            {/* Demo preview content */}
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-briki-50/80 to-briki-100/80 dark:from-briki-950/80 dark:to-briki-900/80">
              <div className="text-center p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('home.hero.title')}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    {t('home.hero.subtitle')}
                  </p>
                </div>
                
                {/* Feature preview icons */}
                <div className="flex justify-center gap-6 mb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-briki-100/80 dark:bg-briki-800/80 flex items-center justify-center mb-1">
                      <FileText className="h-5 w-5 text-briki-600 dark:text-briki-400" />
                    </div>
                    <span className="text-xs text-muted-foreground">Analyze PDFs</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-briki-100/80 dark:bg-briki-800/80 flex items-center justify-center mb-1">
                      <BarChart3 className="h-5 w-5 text-briki-600 dark:text-briki-400" />
                    </div>
                    <span className="text-xs text-muted-foreground">Compare Plans</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-briki-100/80 dark:bg-briki-800/80 flex items-center justify-center mb-1">
                      <Users className="h-5 w-5 text-briki-600 dark:text-briki-400" />
                    </div>
                    <span className="text-xs text-muted-foreground">Client Ready</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Play button overlay */}
            <button
              onClick={handlePlayClick}
              className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors group"
              aria-label="Play demo video - Watch interactive demonstration of Briki features"
              tabIndex={5}
            >
              <div className="w-14 h-14 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg">
                <Play className="h-5 w-5 text-black ml-0.5" fill="currentColor" />
              </div>
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-briki-50/80 to-briki-100/80 dark:from-briki-950/80 dark:to-briki-900/80">
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-briki-600 flex items-center justify-center mx-auto mb-3">
                <Play className="h-6 w-6 text-white" fill="currentColor" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Demo Coming Soon
              </h3>
              <p className="text-muted-foreground text-sm">
                Interactive demo will be available soon. Try the features below!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
