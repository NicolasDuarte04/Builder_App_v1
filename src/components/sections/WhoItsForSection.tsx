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
      <section className="my-20 relative">
        <div className="container z-10 mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
          >
            <div className="flex justify-center">
              <div className="border border-gray-300/50 dark:border-white/20 py-1 px-4 rounded-lg bg-white/80 dark:bg-white/10 backdrop-blur-sm text-gray-900 dark:text-white">
                {t("who_its_for.badge")}
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5 text-gray-900 dark:text-white">
              {t("who_its_for.title")}
            </h2>
            <p className="text-center mt-5 opacity-75 text-gray-700 dark:text-white/90">
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