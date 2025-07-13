"use client";

import { HeroParallax } from '@/components/ui/HeroParallax';
import { products } from '@/data/products';
import { useTranslation } from '@/hooks/useTranslation';
import { WhoItsForSection } from '@/components/sections/WhoItsForSection';
import { FeatureHighlightsSection } from '@/components/sections/FeatureHighlightsSection';
import { UseCasesSection } from '@/components/sections/UseCasesSection';
import { Footer } from '@/components/ui/footer';
export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      {/* Transformed Hero Section with Parallax Effect */}
      <HeroParallax products={products} />
      
      {/* Who It's For Section */}
      <WhoItsForSection />
      
      {/* Feature Highlights Section */}
      <FeatureHighlightsSection />
      
      {/* Use Cases Section */}
      <UseCasesSection />
      
      {/* Footer */}
      <Footer />
    </main>
  );
}
