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
    <TestimonialsSection
      title={t("use_cases.title")}
      description={t("use_cases.description")}
      testimonials={useCases}
    />
  );
}; 