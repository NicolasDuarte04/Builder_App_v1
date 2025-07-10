"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { AppleCardsCarousel } from "@/components/ui/apple-cards-carousel";
import type { ProblemCardData } from "@/components/ui/problem-card";

const PROBLEM_CARDS: ProblemCardData[] = [
  {
    id: "fragmentation",
    title: "Thousands of AI tools, no clear path.",
    category: "Fragmentation",
    content: "It takes endless trial and error to figure out which AI tools actually work — and even more time to make them work together. Most people give up before they get results.",
    image: "/images/problems/fragmentation.png"
  },
  {
    id: "overwhelm",
    title: "I don't even know where to start.",
    category: "Overwhelm",
    content: "Everyone says "just use AI," but no one shows you how. If you're not a developer or a prompt engineer, it feels impossible to get started without wasting hours.",
    image: "/images/problems/overwhelm.png"
  },
  {
    id: "accessibility",
    title: "I don't speak tech or promptese.",
    category: "Accessibility",
    content: "Complex interfaces, English-only instructions, and cryptic prompt formats make AI tools feel out of reach for everyday users — especially in Latin America.",
    image: "/images/problems/accessibility.png"
  },
  {
    id: "dead-ends",
    title: "I tried ChatGPT. Now what?",
    category: "Dead ends",
    content: "People try a tool or two… and get stuck. There's no next step, no roadmap, no hand-holding. Most users never go beyond basic chats or image generation.",
    image: "/images/problems/dead-ends.png"
  },
  {
    id: "exclusion",
    title: "It's not made for people like me.",
    category: "Exclusion",
    content: "AI education is full of buzzwords, expensive courses, and content built for engineers — not creators, students, freelancers, or small business owners.",
    image: "/images/problems/exclusion.png"
  }
];

const PROBLEM_CARDS_ES: ProblemCardData[] = [
  {
    id: "fragmentation",
    title: "Miles de herramientas AI, sin un camino claro.",
    category: "Fragmentación",
    content: "Se necesita mucha prueba y error para descubrir qué herramientas de IA realmente funcionan, y aún más tiempo para hacerlas trabajar juntas. La mayoría se rinde antes de obtener resultados.",
    image: "/images/problems/fragmentation.png"
  },
  {
    id: "overwhelm",
    title: "No sé ni por dónde empezar.",
    category: "Abrumación",
    content: "Todos dicen "usa la IA", pero nadie te muestra cómo. Si no eres desarrollador o experto en prompts, parece imposible comenzar sin perder horas.",
    image: "/images/problems/overwhelm.png"
  },
  {
    id: "accessibility",
    title: "No hablo tecnicismos ni promptese.",
    category: "Accesibilidad",
    content: "Interfaces complejas, instrucciones solo en inglés y formatos crípticos hacen que las herramientas de IA parezcan inalcanzables para usuarios comunes, especialmente en Latinoamérica.",
    image: "/images/problems/accessibility.png"
  },
  {
    id: "dead-ends",
    title: "Probé ChatGPT. ¿Y ahora qué?",
    category: "Callejones sin salida",
    content: "La gente prueba una o dos herramientas... y se estanca. No hay siguiente paso, ni hoja de ruta, ni guía. La mayoría nunca va más allá de chats básicos o generación de imágenes.",
    image: "/images/problems/dead-ends.png"
  },
  {
    id: "exclusion",
    title: "No está hecho para gente como yo.",
    category: "Exclusión",
    content: "La educación en IA está llena de términos técnicos, cursos caros y contenido hecho para ingenieros, no para creadores, estudiantes, freelancers o pequeños empresarios.",
    image: "/images/problems/exclusion.png"
  }
];

export function ProblemSection() {
  const { t, language } = useTranslation();
  const cards = language === 'es' ? PROBLEM_CARDS_ES : PROBLEM_CARDS;

  return (
    <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            {t('problems.title')}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            {t('problems.description')}
          </p>
        </div>

        <AppleCardsCarousel 
          cards={cards}
          className="mt-8"
        />
      </div>
    </section>
  );
} 