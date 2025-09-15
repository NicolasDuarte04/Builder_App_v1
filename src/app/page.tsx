'use client';

import { useEffect } from 'react';
import { telemetry } from '@/lib/telemetry';
import { Hero } from '@/components/ui/hero-with-image-text-and-two-buttons';
import { DemoSection } from '@/components/home/DemoSection';

export default function HomePage() {
  useEffect(() => {
    telemetry.track(telemetry.events.HOME_OPENED, {});
  }, []);

  return (
    <div className="pt-[calc(var(--nav-h,64px)+24px)]">
      <Hero />
      <DemoSection />
    </div>
  );
}