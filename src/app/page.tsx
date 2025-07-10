import { ProjectLibrary } from '@/components/features/ProjectLibrary';
import { RoadmapView } from '@/components/features/RoadmapView';
import { HeroParallax } from '@/components/ui/HeroParallax';
import { TracingBeam } from '@/components/ui/tracing-beam';
import { products } from '@/data/products';

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section with Parallax Effect */}
      <HeroParallax products={products} />
      
      {/* Main Content with Tracing Beam */}
      <TracingBeam className="px-6 py-12">
        <div className="space-y-24">
          {/* Roadmap Section - Will be populated by AI */}
          <section>
            <h2 className="text-3xl font-bold mb-8 text-center">Create Your Project Roadmap</h2>
            <RoadmapView />
          </section>
          
          {/* Project Library Section */}
          <section>
            <h2 className="text-3xl font-bold mb-8 text-center">Your Projects</h2>
            <ProjectLibrary />
          </section>
        </div>
      </TracingBeam>
    </main>
  );
}
