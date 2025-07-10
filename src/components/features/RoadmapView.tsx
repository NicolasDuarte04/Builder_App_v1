import React from 'react';
import type { RoadmapNode } from '@/types/project';

interface RoadmapViewProps {
  nodes?: RoadmapNode[];
}

export function RoadmapView({ nodes = [] }: RoadmapViewProps) {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Your Project Roadmap</h2>
        
        {/* Decision tree visualization - to be implemented */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-center text-gray-500">
            Roadmap visualization will be implemented here
          </div>
        </div>
      </div>
    </section>
  );
} 