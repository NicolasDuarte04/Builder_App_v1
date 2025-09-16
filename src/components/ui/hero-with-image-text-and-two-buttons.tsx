'use client';

import { MoveRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { telemetry } from "@/lib/telemetry";
import { LeadForm } from "@/components/ui/LeadForm";
import dynamic from 'next/dynamic';
import { useState } from 'react';

function Hero() {
  const { t } = useTranslation();
  const InviteCodeModal = dynamic(() => import('@/components/gate/InviteCodeModal').then(mod => ({ default: mod.InviteCodeModal })), { ssr: false });
  const [open, setOpen] = useState(false);

  const handleGetStarted = () => {
    telemetry.track(telemetry.events.HOME_CTA_GET_STARTED_CLICKED, { source: 'hero' });
    setOpen(true);
  };

  const handleSeeHow = () => {
    telemetry.track(telemetry.events.HOME_CTA_TUTORIAL_CLICKED, { source: 'hero' });
    const demoSection = document.getElementById('demo-section');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 items-center lg:grid-cols-2">
          <div className="flex gap-6 flex-col">
            <div className="flex gap-6 flex-col">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl max-w-lg tracking-tight text-left font-bold text-foreground">
                {t('home.simple.headline')}
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-md text-left">
                {t('home.simple.subhead')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0"
                onClick={handleGetStarted}
              >
                {t('home.simple.cta')} <MoveRight className="w-4 h-4" />
              </Button>
              <Button 
                size="lg" 
                className="gap-2" 
                variant="outline"
                onClick={handleSeeHow}
              >
                {t('home.simple.see_how')} <FileText className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <LeadForm />
          </div>
        </div>
      </div>
      <InviteCodeModal open={open} onOpenChange={setOpen} />
    </div>
  );
}

export { Hero };