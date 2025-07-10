import React from 'react';
import type { Project } from '@/types/project';

interface ProjectLibraryProps {
  projects?: Project[];
}

export function ProjectLibrary({ projects = [] }: ProjectLibraryProps) {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Project Library</h2>
        
        {/* Project grid - to be implemented */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold mb-2">{project.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{project.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  View Roadmap →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 