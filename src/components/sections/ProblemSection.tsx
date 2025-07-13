"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { ProblemCard } from "@/components/ui/problem-card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  IconPuzzle,
  IconAlertTriangle,
  IconLanguage,
  IconMapPin,
  IconUsers,
} from "@tabler/icons-react";

const CARD_ICONS = [
  IconPuzzle,
  IconAlertTriangle,
  IconLanguage,
  IconMapPin,
  IconUsers,
];

export function ProblemSection() {
  const { t, language } = useTranslation();
  // Only show 4 cards for layout, but keep 5th for future use
  const cards = [
    {
      src: "/images/problems/problem-fragmentation.png",
      title: language === 'es' ? "Miles de herramientas AI, sin un camino claro." : "Thousands of AI tools, no clear path.",
      category: language === 'es' ? "Fragmentación" : "Fragmentation",
      icon: IconPuzzle,
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>{language === 'es'
            ? "Se necesita mucha prueba y error para descubrir qué herramientas de IA realmente funcionan, y aún más tiempo para hacerlas trabajar juntas. La mayoría se rinde antes de obtener resultados."
            : "It takes endless trial and error to figure out which AI tools actually work — and even more time to make them work together. Most people give up before they get results."}
          </p>
        </div>
      ),
    },
    {
      src: "/images/problems/problem-overwhelm.png",
      title: language === 'es' ? "No sé ni por dónde empezar." : "I don't even know where to start.",
      category: language === 'es' ? "Abrumación" : "Overwhelm",
      icon: IconAlertTriangle,
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>{language === 'es'
            ? "Todos dicen 'usa la IA', pero nadie te muestra cómo. Si no eres desarrollador o experto en prompts, parece imposible comenzar sin perder horas."
            : "Everyone says 'just use AI,' but no one shows you how. If you're not a developer or a prompt engineer, it feels impossible to get started without wasting hours."}
          </p>
        </div>
      ),
    },
    {
      src: "/images/problems/problem-accessibility.png",
      title: language === 'es' ? "No hablo tecnicismos ni promptese." : "I don't speak tech or promptese.",
      category: language === 'es' ? "Accesibilidad" : "Accessibility",
      icon: IconLanguage,
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>{language === 'es'
            ? "Interfaces complejas, instrucciones solo en inglés y formatos crípticos hacen que las herramientas de IA parezcan inalcanzables para usuarios comunes, especialmente en Latinoamérica."
            : "Complex interfaces, English-only instructions, and cryptic prompt formats make AI tools feel out of reach for everyday users — especially in Latin America."}
          </p>
        </div>
      ),
    },
    {
      src: "/images/problems/problem-dead-ends.png",
      title: language === 'es' ? "Probé ChatGPT. ¿Y ahora qué?" : "I tried ChatGPT. Now what?",
      category: language === 'es' ? "Callejones sin salida" : "Dead ends",
      icon: IconMapPin,
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>{language === 'es'
            ? "La gente prueba una o dos herramientas... y se estanca. No hay siguiente paso, ni hoja de ruta, ni guía. La mayoría nunca va más allá de chats básicos o generación de imágenes."
            : "People try a tool or two… and get stuck. There's no next step, no roadmap, no hand-holding. Most users never go beyond basic chats or image generation."}
          </p>
        </div>
      ),
    },
  ];

  return (
    <section className="w-full relative bg-white dark:bg-black">
      {/* Background gradient for light beam consistency */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-neutral-100/50 to-white dark:from-black dark:via-neutral-900/50 dark:to-black pointer-events-none" />
      {/* Main content */}
      <div className="relative w-full py-20">
        {/* Header content - constrained width */}
        <div className="max-w-2xl mx-auto px-4 text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-black dark:text-white">
            {t('problems.title')}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-200 text-opacity-100">
            {t('problems.description')}
          </p>
        </div>
        {/* Cards - full width */}
        <div className="w-full">
          <motion.div
            className="flex w-full cursor-grab gap-6 overflow-x-auto px-8 pb-12 pt-8 active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
            initial="initial"
            animate="animate"
            whileTap="tap"
          >
            {cards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center"
                >
                  <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-200/60 to-cyan-200/60 dark:from-blue-900/40 dark:to-cyan-900/40 shadow-lg">
                    <Icon className="w-7 h-7 text-blue-500 dark:text-cyan-300" />
                  </div>
                  <ProblemCard
                    card={card}
                    index={index}
                    layout
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
        {/* CTA */}
        <div className="mt-8 flex flex-col items-center">
          <p className="mb-4 text-lg font-medium text-neutral-700 dark:text-neutral-100">
            {language === 'es'
              ? '¿Te identificas con alguno de estos retos? Descubre cómo Briki puede ayudarte.'
              : 'Relate to any of these challenges? Discover how Briki can help you.'}
          </p>
          <a
            href="#roadmap"
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-3 rounded-full shadow-lg hover:from-blue-600 hover:to-cyan-600 transition-all text-lg font-semibold"
          >
            {language === 'es' ? 'Descubre tu ruta →' : 'Discover your roadmap →'}
          </a>
        </div>
      </div>
    </section>
  );
} 