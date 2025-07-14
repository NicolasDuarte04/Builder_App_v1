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
      title: language === 'es' ? "Miles de opciones de seguros, sin claridad." : "Thousands of insurance options, no clarity.",
      category: language === 'es' ? "Confusión" : "Confusion",
      icon: IconPuzzle,
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>{language === 'es'
            ? "Hay cientos de planes de seguros disponibles, pero es difícil saber cuál es el mejor para ti. La mayoría de personas se rinden antes de encontrar la opción correcta."
            : "There are hundreds of insurance plans available, but it's hard to know which one is best for you. Most people give up before finding the right option."}
          </p>
        </div>
      ),
    },
    {
      src: "/images/problems/problem-overwhelm.png",
      title: language === 'es' ? "No entiendo los términos del seguro." : "I don't understand insurance terms.",
      category: language === 'es' ? "Complejidad" : "Complexity",
      icon: IconAlertTriangle,
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>{language === 'es'
            ? "Deductibles, copagos, cobertura máxima... los términos de seguros son confusos. Si no eres experto, parece imposible tomar una decisión informada."
            : "Deductibles, copays, maximum coverage... insurance terms are confusing. If you're not an expert, it feels impossible to make an informed decision."}
          </p>
        </div>
      ),
    },
    {
      src: "/images/problems/problem-accessibility.png",
      title: language === 'es' ? "Los formularios son largos y complicados." : "Forms are long and complicated.",
      category: language === 'es' ? "Accesibilidad" : "Accessibility",
      icon: IconLanguage,
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>{language === 'es'
            ? "Formularios de 20 páginas, preguntas técnicas y procesos complejos hacen que comprar seguros parezca inalcanzable para usuarios comunes."
            : "20-page forms, technical questions, and complex processes make buying insurance feel out of reach for everyday users."}
          </p>
        </div>
      ),
    },
    {
      src: "/images/problems/problem-dead-ends.png",
      title: language === 'es' ? "No sé si estoy pagando de más." : "I don't know if I'm overpaying.",
      category: language === 'es' ? "Desconfianza" : "Distrust",
      icon: IconMapPin,
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>{language === 'es'
            ? "La gente compra seguros sin comparar opciones... y se queda con la duda. No hay forma fácil de saber si obtuvieron el mejor precio o cobertura."
            : "People buy insurance without comparing options... and are left wondering. There's no easy way to know if they got the best price or coverage."}
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
            {language === 'es' ? 'Encuentra tu seguro →' : 'Find your insurance →'}
          </a>
        </div>
      </div>
    </section>
  );
} 