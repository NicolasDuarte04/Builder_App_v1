/**
 * Event Bus for Gemini-style structured data communication
 * This allows the backend to emit structured data (plans, PDFs, etc.) 
 * separately from the chat stream
 */

type EventCallback = (data: any) => void;
type EventMap = Map<string, Set<EventCallback>>;

class EventBus {
  private events: EventMap = new Map();
  private static instance: EventBus;

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    const callbacks = this.events.get(event)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    };
  }

  /**
   * Emit an event with data
   */
  emit(event: string, data: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.events.delete(event);
  }

  /**
   * Clear all event listeners
   */
  clear(): void {
    this.events.clear();
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();

// Type-safe event names
export const BrikiEvents = {
  STRUCTURED_DATA_RECEIVED: 'structured-data-received',
  INSURANCE_PLANS_RECEIVED: 'insurance-plans-received',
  PDF_ANALYSIS_RECEIVED: 'pdf-analysis-received',
  COMPARISON_READY: 'comparison-ready',
  ERROR_OCCURRED: 'error-occurred',
  POLICY_SAVED: 'policy-saved',
} as const;

// Type definitions for structured data
export interface StructuredDataEvent {
  type: 'plans' | 'pdf' | 'comparison' | 'analysis';
  data: any;
  metadata?: {
    timestamp: Date;
    source?: string;
    query?: string;
  };
}

// Helper hook for React components
import { useEffect } from 'react';

export function useBrikiEvent(
  event: string, 
  handler: EventCallback,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const unsubscribe = eventBus.on(event, handler);
    return unsubscribe;
  }, deps);
}