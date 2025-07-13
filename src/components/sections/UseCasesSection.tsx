"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { TestimonialsSection } from "@/components/ui/testimonials-with-marquee";

export const UseCasesSection: React.FC = () => {
  const { t } = useTranslation();

  const useCases = [
    {
      author: {
        name: "María González",
        handle: "@mariamarketing",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
      },
      text: "Usé Briki para crear un prompt que me ayudó a escribir mejores captions para Instagram. ¡Mis posts ahora tienen 3x más engagement!",
      href: "https://twitter.com/mariamarketing"
    },
    {
      author: {
        name: "Carlos Rodríguez",
        handle: "@carloscreator",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      },
      text: "Briki me ayudó a resumir un artículo de 20 páginas en 2 minutos. El prompt que generé fue perfecto para mi tarea universitaria.",
      href: "https://twitter.com/carloscreator"
    },
    {
      author: {
        name: "Ana Martínez",
        handle: "@anabusiness",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
      },
      text: "Como dueña de un pequeño negocio, Briki me ayuda a crear emails profesionales para mis clientes sin gastar horas escribiendo.",
      href: "https://twitter.com/anabusiness"
    },
    {
      author: {
        name: "Luis Pérez",
        handle: "@luispro",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      text: "Briki transformó mi forma de usar ChatGPT. Ahora obtengo respuestas mucho más precisas y útiles para mi trabajo.",
      href: "https://twitter.com/luispro"
    },
    {
      author: {
        name: "Sarah Johnson",
        handle: "@sarahstudent",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
      },
      text: "I used Briki to write a research paper outline. The prompt it helped me create was so much better than what I was doing before!",
      href: "https://twitter.com/sarahstudent"
    },
    {
      author: {
        name: "David Chen",
        handle: "@davidcontent",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
      },
      text: "Briki helped me create the perfect prompt for Midjourney. My AI-generated images are now exactly what I envisioned.",
      href: "https://twitter.com/davidcontent"
    },
    {
      author: {
        name: "Emily Davis",
        handle: "@emilyentrepreneur",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
      },
      text: "As a small business owner, Briki saves me hours every week. I can now create professional content without hiring a copywriter.",
      href: "https://twitter.com/emilyentrepreneur"
    },
    {
      author: {
        name: "Michael Brown",
        handle: "@michaelpro",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
      },
      text: "Briki's confidence advisor helped me understand why my prompts weren't working. Now I get much better results from AI tools.",
      href: "https://twitter.com/michaelpro"
    }
  ];

  return (
    <TestimonialsSection
      title={t("use_cases.title")}
      description={t("use_cases.description")}
      testimonials={useCases}
    />
  );
}; 