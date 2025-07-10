import { ProjectLibrary } from '@/components/features/ProjectLibrary';
import { RoadmapView } from '@/components/features/RoadmapView';
import { HeroParallax } from '@/components/ui/HeroParallax';
import { products } from '@/data/products';

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section with Parallax Effect */}
      <HeroParallax products={products} />
      
      {/* Roadmap Section - Will be populated by AI */}
      <RoadmapView />
      
      {/* Project Library Section */}
      <ProjectLibrary />
    </main>
  );
}
