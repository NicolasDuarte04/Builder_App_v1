"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

const GRADIENTS = {
  fragmentation: "bg-gradient-to-br from-blue-500/20 to-purple-500/20",
  overwhelm: "bg-gradient-to-br from-red-500/20 to-orange-500/20",
  accessibility: "bg-gradient-to-br from-green-500/20 to-teal-500/20",
  deadEnds: "bg-gradient-to-br from-yellow-500/20 to-amber-500/20",
  exclusion: "bg-gradient-to-br from-pink-500/20 to-rose-500/20",
};

const PROBLEM_CARDS = {
  en: [
    {
      src: GRADIENTS.fragmentation,
      title: "Thousands of AI tools, no clear path.",
      category: "Fragmentation",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            It takes endless trial and error to figure out which AI tools actually work — and even more time to make them work together. Most people give up before they get results.
          </p>
        </div>
      ),
    },
    {
      src: GRADIENTS.overwhelm,
      title: "I don't even know where to start.",
      category: "Overwhelm",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            Everyone says "just use AI," but no one shows you how. If you're not a developer or a prompt engineer, it feels impossible to get started without wasting hours.
          </p>
        </div>
      ),
    },
    {
      src: GRADIENTS.accessibility,
      title: "I don't speak tech or promptese.",
      category: "Accessibility",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            Complex interfaces, English-only instructions, and cryptic prompt formats make AI tools feel out of reach for everyday users — especially in Latin America.
          </p>
        </div>
      ),
    },
    {
      src: GRADIENTS.deadEnds,
      title: "I tried ChatGPT. Now what?",
      category: "Dead ends",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            People try a tool or two… and get stuck. There's no next step, no roadmap, no hand-holding. Most users never go beyond basic chats or image generation.
          </p>
        </div>
      ),
    },
    {
      src: GRADIENTS.exclusion,
      title: "It's not made for people like me.",
      category: "Exclusion",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            AI education is full of buzzwords, expensive courses, and content built for engineers — not creators, students, freelancers, or small business owners.
          </p>
        </div>
      ),
    },
  ],
  es: [
    {
      src: GRADIENTS.fragmentation,
      title: "Miles de herramientas AI, sin un camino claro.",
      category: "Fragmentación",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            Se necesita mucha prueba y error para descubrir qué herramientas de IA realmente funcionan, y aún más tiempo para hacerlas trabajar juntas. La mayoría se rinde antes de obtener resultados.
          </p>
        </div>
      ),
    },
    {
      src: GRADIENTS.overwhelm,
      title: "No sé ni por dónde empezar.",
      category: "Abrumación",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            Todos dicen "usa la IA", pero nadie te muestra cómo. Si no eres desarrollador o experto en prompts, parece imposible comenzar sin perder horas.
          </p>
        </div>
      ),
    },
    {
      src: GRADIENTS.accessibility,
      title: "No hablo tecnicismos ni promptese.",
      category: "Accesibilidad",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            Interfaces complejas, instrucciones solo en inglés y formatos crípticos hacen que las herramientas de IA parezcan inalcanzables para usuarios comunes, especialmente en Latinoamérica.
          </p>
        </div>
      ),
    },
    {
      src: GRADIENTS.deadEnds,
      title: "Probé ChatGPT. ¿Y ahora qué?",
      category: "Callejones sin salida",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            La gente prueba una o dos herramientas... y se estanca. No hay siguiente paso, ni hoja de ruta, ni guía. La mayoría nunca va más allá de chats básicos o generación de imágenes.
          </p>
        </div>
      ),
    },
    {
      src: GRADIENTS.exclusion,
      title: "No está hecho para gente como yo.",
      category: "Exclusión",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            La educación en IA está llena de términos técnicos, cursos caros y contenido hecho para ingenieros, no para creadores, estudiantes, freelancers o pequeños empresarios.
          </p>
        </div>
      ),
    },
  ],
};

export function ProblemSection() {
  const { t, language } = useTranslation();
  const cards = PROBLEM_CARDS[language === 'es' ? 'es' : 'en'];

  return (
    <section className="w-full relative">
      {/* Background gradient for light beam consistency */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-50/50 to-neutral-100/50 dark:from-neutral-900/50 dark:to-neutral-800/50 pointer-events-none" />
      
      {/* Main content */}
      <div className="relative w-full py-20">
        {/* Header content - constrained width */}
        <div className="max-w-2xl mx-auto px-4 text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            {t('problems.title')}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            {t('problems.description')}
          </p>
        </div>

        {/* Carousel - full width */}
        <div className="w-full">
          <Carousel 
            items={cards.map((card, index) => (
              <Card key={index} card={card} index={index} layout />
            ))}
          />
        </div>
      </div>
    </section>
  );
} 