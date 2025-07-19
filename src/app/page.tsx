"use client";

import { HeroParallax } from '@/components/ui/HeroParallax';
import { products } from '@/data/products';
import { useTranslation } from '@/hooks/useTranslation';
import { WhoItsForSection } from '@/components/sections/WhoItsForSection';
import { FeatureHighlightsSection } from '@/components/sections/FeatureHighlightsSection';
import { UseCasesSection } from '@/components/sections/UseCasesSection';
import { AIAssistantDemoSection } from '@/components/sections/AIAssistantDemoSection';
import { DocumentAnalysisSection } from '@/components/sections/DocumentAnalysisSection';
import { Footer } from '@/components/blocks/footer-section';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      {/* Transformed Hero Section with Parallax Effect */}
      <HeroParallax products={products} />
      
      {/* AI Assistant Demo Section */}
      <AIAssistantDemoSection />
      
      {/* Document Analysis Section */}
      <DocumentAnalysisSection />
      
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
