"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { TestimonialCard, TestimonialAuthor } from "@/components/ui/testimonial-card";
import { RetroGrid } from "@/components/ui/retro-grid";
import { motion } from "framer-motion";

export const UseCasesSection: React.FC = () => {
  const { t } = useTranslation();

  const useCases = [
    {
      author: {
        name: "María González",
        handle: "@mariamarketing",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
      },
      text: "Briki me ayudó a encontrar un seguro de viaje perfecto para mi viaje a México. Encontré una opción 40% más barata que las que había visto antes.",
      href: "https://twitter.com/mariamarketing"
    },
    {
      author: {
        name: "Carlos Rodríguez",
        handle: "@carloscreator",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      },
      text: "Como freelancer, necesitaba seguro de salud. Briki me explicó las opciones de manera clara y encontré un plan que se ajusta a mi presupuesto.",
      href: "https://twitter.com/carloscreator"
    },
    {
      author: {
        name: "Ana Martínez",
        handle: "@anabusiness",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
      },
      text: "Briki analizó mi póliza de auto y me explicó exactamente qué está cubierto. Ahora entiendo mi seguro mucho mejor.",
      href: "https://twitter.com/anabusiness"
    },
    {
      author: {
        name: "Luis Pérez",
        handle: "@luispro",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      text: "Para mi pequeño negocio, Briki encontró un seguro de responsabilidad civil que protege mi empresa sin romper el banco.",
      href: "https://twitter.com/luispro"
    },
    {
      author: {
        name: "Sarah Johnson",
        handle: "@sarahstudent",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
      },
      text: "I used Briki to find health insurance for my family. It compared 15 different plans and found us better coverage for less money.",
      href: "https://twitter.com/sarahstudent"
    },
    {
      author: {
        name: "David Chen",
        handle: "@davidcontent",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
      },
      text: "Briki helped me understand my life insurance policy. It explained everything in plain English and found gaps in my coverage.",
      href: "https://twitter.com/davidcontent"
    },
    {
      author: {
        name: "Emily Davis",
        handle: "@emilyentrepreneur",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
      },
      text: "As a small business owner, Briki found me comprehensive business insurance that covers everything I need at a great price.",
      href: "https://twitter.com/emilyentrepreneur"
    },
    {
      author: {
        name: "Michael Brown",
        handle: "@michaelpro",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
      },
      text: "Briki's PDF analysis feature is amazing. I uploaded my insurance documents and it explained everything I needed to know.",
      href: "https://twitter.com/michaelpro"
    }
  ];

  return (
    <section className="relative bg-white dark:bg-black text-gray-900 dark:text-white overflow-hidden py-20 lg:py-24">
      {/* Retro Grid Background */}
      <RetroGrid className="opacity-20" angle={35} />
      
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-4 px-4 mb-8 lg:mb-12"
        >
          <h2 className="max-w-4xl text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 dark:text-white mb-4 lg:mb-6">
            {(() => {
              const title = t("use_cases.title");
              // Split to highlight "Briki" in the title
              const parts = title.split('Briki');
              if (parts.length > 1) {
                return (
                  <>
                    <span>{parts[0]}</span>
                    <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                      Briki
                    </span>
                    <span>{parts[1]}</span>
                  </>
                );
              }
              return title;
            })()}
          </h2>
          <p className="text-lg md:text-xl max-w-3xl text-gray-600 dark:text-gray-300 leading-relaxed">
            {t("use_cases.description")}
          </p>
        </motion.div>

        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
          <div className="group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] flex-row [--duration:40s]">
            <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
              {[...Array(4)].map((_, setIndex) => (
                useCases.map((testimonial, i) => (
                  <TestimonialCard 
                    key={`${setIndex}-${i}`}
                    {...testimonial}
                  />
                ))
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r from-white dark:from-black sm:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-white dark:from-black sm:block" />
        </div>
      </div>
    </section>
  );
}; 