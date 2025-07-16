"use client";

import { InsurancePlansMessage } from "@/components/assistant/InsurancePlansMessage";

// Mock insurance plans data
const mockPlans = [
  {
    id: 1,
    name: "Plan Salud Premium",
    category: "salud",
    provider: "Seguros Bolívar",
    basePrice: 150000,
    currency: "COP",
    benefits: [
      "Cobertura médica completa",
      "Hospitalización sin límite",
      "Medicamentos incluidos",
      "Consultas ilimitadas"
    ],
    isExternal: true,
    externalLink: "https://www.segurosbolivar.com/cotizar",
    features: ["telemedicina", "red_nacional"]
  },
  {
    id: 2,
    name: "Plan Salud Básico",
    category: "salud",
    provider: "Sura",
    basePrice: 80000,
    currency: "COP",
    benefits: [
      "Consultas médicas generales",
      "Hospitalización básica",
      "Urgencias 24/7"
    ],
    isExternal: false,
    externalLink: null,
    features: ["urgencias", "consultas"]
  },
  {
    id: 3,
    name: "Plan Salud Familiar",
    category: "salud",
    provider: "Allianz",
    basePrice: 250000,
    currency: "COP",
    benefits: [
      "Cobertura para toda la familia",
      "Medicina preventiva",
      "Especialistas sin copago",
      "Odontología incluida",
      "Oftalmología incluida"
    ],
    isExternal: true,
    externalLink: "https://www.allianz.co/salud",
    features: ["familiar", "preventiva", "especialistas"]
  }
];

export default function TestInsurancePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Test Insurance Plans Display
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              Mock Assistant Message
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Based on your requirements, I found the following health insurance plans that match your budget:
            </p>
          </div>
          
          <InsurancePlansMessage
            plans={mockPlans}
            category="salud"
            onViewAllPlans={() => console.log("View all plans clicked")}
          />
        </div>
      </div>
    </div>
  );
} 