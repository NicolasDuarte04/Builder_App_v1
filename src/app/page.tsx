"use client";

import { ProjectLibrary } from '@/components/features/ProjectLibrary';
import { RoadmapView } from '@/components/features/RoadmapView';
import { HeroParallax } from '@/components/ui/HeroParallax';
import { products } from '@/data/products';
import { ProblemSection } from '@/components/sections/ProblemSection';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { IconBrain, IconRocket, IconTools, IconUsers } from '@tabler/icons-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function Home() {
  const { t } = useTranslation();

  const features = [
    {
      title: t('features.ai_powered.title'),
      description: t('features.ai_powered.description'),
      icon: <IconBrain className="h-6 w-6 text-[#009BFF]" />,
    },
    {
      title: t('features.tool_recommendations.title'),
      description: t('features.tool_recommendations.description'),
      icon: <IconTools className="h-6 w-6 text-[#009BFF]" />,
    },
    {
      title: t('features.community_driven.title'),
      description: t('features.community_driven.description'),
      icon: <IconUsers className="h-6 w-6 text-[#009BFF]" />,
    },
    {
      title: t('features.fast_implementation.title'),
      description: t('features.fast_implementation.description'),
      icon: <IconRocket className="h-6 w-6 text-[#009BFF]" />,
    },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section with Parallax Effect */}
      <HeroParallax products={products} />
      
      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-24 2xl:px-32 max-w-[1440px] mx-auto">
        {/* Roadmap Creation Section */}
        <RoadmapView />

        {/* Project Library Section */}
        <section className="w-full py-12">
          <h2 className="text-3xl font-bold mb-8">
            {t('projects.title')}
          </h2>
          <ProjectLibrary />
        </section>

        {/* Common Challenges Section */}
        <ProblemSection />

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
              {t('features.title')}
            </h2>
            <p className="max-w-[900px] text-neutral-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-neutral-200 text-opacity-100">
              {t('features.subtitle')}
            </p>
          </div>
          <div className="mt-12">
            <BentoGrid>
              {features.map((feature, i) => (
                <BentoGridItem
                  key={i}
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                  className={i === 3 ? "md:col-span-2" : ""}
                />
              ))}
            </BentoGrid>
          </div>
        </section>
      </div>
    </main>
  );
}
