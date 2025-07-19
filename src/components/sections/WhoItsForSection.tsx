"use client";
import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { GlowingBackground } from "@/components/ui/GlowingBackground";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";

const testimonials = [
  {
    text: "Encontré un seguro de salud asequible que se ajusta a mi presupuesto como freelancer. Briki me explicó todo de manera clara.",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    name: "María González",
    role: "Freelancer",
  },
  {
    text: "Briki me ayudó a encontrar el seguro familiar perfecto. Ahora todos estamos protegidos sin gastar una fortuna.",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    name: "Carlos Rodríguez",
    role: "Padre de Familia",
  },
  {
    text: "Para mi pequeño negocio, Briki encontró un seguro de responsabilidad civil que protege mi empresa al mejor precio.",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Ana Martínez",
    role: "Dueña de Pequeño Negocio",
  },
  {
    text: "Briki me explicó las opciones de Medicare de manera simple. Ahora entiendo qué cobertura necesito realmente.",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    name: "Luis Pérez",
    role: "Jubilado",
  },
  {
    text: "I found affordable health insurance for my family through Briki. It compared 15 different plans and found us better coverage.",
    image: "https://randomuser.me/api/portraits/women/5.jpg",
    name: "Sarah Johnson",
    role: "Young Professional",
  },
  {
    text: "Briki helped me understand my life insurance policy. It explained everything in plain English and found gaps in coverage.",
    image: "https://randomuser.me/api/portraits/men/6.jpg",
    name: "David Chen",
    role: "Family Man",
  },
  {
    text: "As a small business owner, Briki found me comprehensive business insurance that covers everything I need.",
    image: "https://randomuser.me/api/portraits/women/7.jpg",
    name: "Emily Davis",
    role: "Small Business Owner",
  },
  {
    text: "Briki's PDF analysis feature is amazing. I uploaded my insurance documents and it explained everything clearly.",
    image: "https://randomuser.me/api/portraits/men/8.jpg",
    name: "Michael Brown",
    role: "Insurance Shopper",
  },
  {
    text: "Briki me ayudó a encontrar un seguro de viaje perfecto para mi viaje a Europa. Ahorré 40% en comparación con otras opciones.",
    image: "https://randomuser.me/api/portraits/women/9.jpg",
    name: "Sofia Torres",
    role: "Viajera Frecuente",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export const WhoItsForSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <GlowingBackground>
      <section className="py-20 lg:py-24 relative">
        <div className="container z-10 mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-gray-800 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4 lg:mb-6 shadow-sm border border-blue-200 dark:border-blue-800">
              {t("who_its_for.badge")}
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 dark:text-white mb-4 lg:mb-6 max-w-4xl mx-auto">
              {(() => {
                const title = t("who_its_for.title");
                // Split the title to apply gradient to "Briki Insurance Assistant"
                const parts = title.split(' ');
                const firstPart = parts.slice(0, 2).join(' '); // "Who is" or "¿Para quién"
                const highlightPart = parts.slice(2, 5).join(' '); // "Briki Insurance Assistant" or equivalent
                const lastPart = parts.slice(5).join(' '); // "for?" or equivalent
                
                return (
                  <>
                    <span>{firstPart}</span>{' '}
                    <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                      {highlightPart}
                    </span>{' '}
                    <span>{lastPart}</span>
                  </>
                );
              })()}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {t("who_its_for.subtitle")}
            </p>
          </motion.div>

          <div className="flex justify-center gap-6 mt-8 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[740px] overflow-hidden">
            <TestimonialsColumn testimonials={firstColumn} duration={15} />
            <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
            <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
          </div>
        </div>
      </section>
    </GlowingBackground>
  );
}; 