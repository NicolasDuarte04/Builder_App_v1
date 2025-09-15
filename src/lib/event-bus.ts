'use client';

import { useEffect } from 'react';

// Briki Events Constants
export const BrikiEvents = {
  // Core events used by observers
  STRUCTURED_DATA_RECEIVED: 'structured-data:received',
  INSURANCE_PLANS_RECEIVED: 'insurance-plans:received',
  INSURANCE_TEMPLATES_RECEIVED: 'insurance-templates:received',
  PLAN_RESULTS_UPDATED: 'plan-results:updated',
  PLAN_PINNED: 'plan-pinned',
  PLAN_UNPINNED: 'plan-unpinned',
  CATEGORY_FALLBACK_SUGGESTED: 'insurance-category-not-found',
  POLICY_SAVED: 'policy:saved',
  
  // Telemetry events
  BRIEF_PARSE_REQUESTED: 'telemetry:brief-parse-requested',
  BRIEF_PARSED_SUCCESS: 'telemetry:brief-parsed-success',
  BRIEF_PARSED_FAILED: 'telemetry:brief-parsed-failed',
  BRIEF_UPDATED: 'telemetry:brief-updated',
  BRIEF_APPLIED: 'telemetry:brief-applied',
  BRIEF_INJECTED_INTO_TOOL: 'telemetry:brief-injected-into-tool',
  PDF_NORMALIZED: 'telemetry:pdf-normalized',
  URL_NORMALIZED: 'telemetry:url-normalized',
  TEMPLATE_USED: 'telemetry:template-used',
  COMPARATOR_OPENED: 'telemetry:comparator-opened',
  PROPOSAL_CREATED: 'telemetry:proposal-created',
} as const;

export type BrikiEventName = typeof BrikiEvents[keyof typeof BrikiEvents];

// Event types for structured data
export interface StructuredDataEvent {
  type: string;
  data: {
    title?: string;
    plans: any[];
    category?: string;
  };
  metadata?: {
    query?: string;
    fromPin?: boolean;
  };
}

// Simple event bus implementation
class SimpleEventBus {
  private handlers = new Map<string, Set<Function>>();

  on(type: string, handler: Function): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => this.off(type, handler);
  }

  off(type: string, handler: Function): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler);
      if (typeHandlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  emit(type: string, payload?: any): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Event handler error for ${type}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

// Global event bus instance
export const eventBus = new SimpleEventBus();

// React hook for listening to events
export function useBrikiEvent<T = any>(
  type: BrikiEventName | string, 
  handler: (payload: T) => void, 
  deps: any[] = []
): void {
  useEffect(() => {
    const unsubscribe = eventBus.on(type, handler);
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, handler, ...deps]);
}

// Convenience emit function
export function emit<T = any>(type: BrikiEventName | string, payload?: T): void {
  eventBus.emit(type, payload);
}