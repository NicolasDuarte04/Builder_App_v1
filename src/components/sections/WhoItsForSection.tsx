"use client";
import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { GlowingBackground } from "@/components/ui/GlowingBackground";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";

const testimonials = [
  {
    text: "Aprende a usar IA para mejorar tus tareas, investigaciones y proyectos académicos de manera ética y efectiva.",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    name: "María González",
    role: "Estudiante de Marketing",
  },
  {
    text: "Genera ideas, mejora tu escritura y optimiza tu contenido con prompts que realmente funcionan.",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    name: "Carlos Rodríguez",
    role: "Creador de Contenido",
  },
  {
    text: "Automatiza tareas, mejora la atención al cliente y optimiza tus procesos sin conocimientos técnicos.",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Ana Martínez",
    role: "Dueña de Pequeño Negocio",
  },
  {
    text: "Mejora tu productividad, automatiza tareas repetitivas y mantén tu ventaja competitiva con IA.",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    name: "Luis Pérez",
    role: "Profesional Independiente",
  },
  {
    text: "Learn to use AI to improve your assignments, research, and academic projects ethically and effectively.",
    image: "https://randomuser.me/api/portraits/women/5.jpg",
    name: "Sarah Johnson",
    role: "Marketing Student",
  },
  {
    text: "Generate ideas, improve your writing, and optimize your content with prompts that actually work.",
    image: "https://randomuser.me/api/portraits/men/6.jpg",
    name: "David Chen",
    role: "Content Creator",
  },
  {
    text: "Automate tasks, improve customer service, and optimize your processes without technical knowledge.",
    image: "https://randomuser.me/api/portraits/women/7.jpg",
    name: "Emily Davis",
    role: "Small Business Owner",
  },
  {
    text: "Improve your productivity, automate repetitive tasks, and maintain your competitive advantage with AI.",
    image: "https://randomuser.me/api/portraits/men/8.jpg",
    name: "Michael Brown",
    role: "Independent Professional",
  },
  {
    text: "Transforma tu forma de trabajar con IA de manera simple y efectiva, sin complicaciones técnicas.",
    image: "https://randomuser.me/api/portraits/women/9.jpg",
    name: "Sofia Torres",
    role: "Emprendedora",
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

          <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
            <TestimonialsColumn testimonials={firstColumn} duration={15} />
            <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
            <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
          </div>
        </div>
      </section>
    </GlowingBackground>
  );
}; 