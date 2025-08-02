"use client";

import { useBrikiEvent } from '@/lib/event-bus';

interface CategoryFallbackObserverProps {
  appendAssistantMessage: (content: string) => void;
}

/**
 * CategoryFallbackObserver - Listens for category not found events and injects helpful messages
 */
export function CategoryFallbackObserver({ appendAssistantMessage }: CategoryFallbackObserverProps) {
  
  // Listen for category not found events
  useBrikiEvent('insurance-category-not-found', (event: any) => {
    console.log('❌ Category not found:', event);
    
    const categoryNames: Record<string, string> = {
      'mascotas': 'mascotas',
      'auto': 'automóviles',
      'salud': 'salud',
      'vida': 'vida',
      'hogar': 'hogar',
      'viaje': 'viajes',
      'empresarial': 'empresas',
      'educacion': 'educación'
    };
    
    const requestedName = categoryNames[event.requestedCategory] || event.requestedCategory;
    
    // Professional message without emojis
    const message = `No encontramos planes de seguro para ${requestedName} en este momento.

Categorías disponibles:
- Seguro de Auto
- Seguro de Salud
- Seguro de Vida
- Seguro de Hogar
- Seguro de Viaje
- Seguro de Educación

¿Qué tipo de seguro te interesa?`;
    
    appendAssistantMessage(message);
  });

  // This component doesn't render anything
  return null;
}