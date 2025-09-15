"use client";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { ComparedPlan } from "@/types/compare";
import { telemetry, getUserContext } from "@/lib/telemetry";

// Idempotency guard per session for COMPARATOR_OPENED
const comparatorOpenedSessions = new Set<string>();

interface CompareStoreState {
  items: ComparedPlan[];
  
  // Actions
  add: (item: ComparedPlan) => void;
  remove: (id: string) => void;
  clear: () => void;
}

// Derived selectors interface
interface CompareStoreDerived {
  count: number;
  isFull: boolean;
  isEmpty: boolean;
  isInCompare: (id: string) => boolean;
}

type CompareStoreWithDerived = CompareStoreState & CompareStoreDerived;

export const useCompareStore = create<CompareStoreWithDerived>()((set, get) => ({
  items: [],
  
  // Derived selectors as getters
  get count() {
    return get().items.length;
  },
  
  get isFull() {
    return get().items.length >= 3;
  },
  
  get isEmpty() {
    return get().items.length === 0;
  },

  isInCompare: (id: string) => {
    return get().items.some(item => item.id === id);
  },

  // Actions
  add: (item: ComparedPlan) => {
    const state = get();
    
    // Guard: max 3 items
    if (state.items.length >= 3) {
      return;
    }
    
    // Guard: dedup by id
    if (state.items.some(existing => existing.id === item.id)) {
      return;
    }
    
    const newItems = [...state.items, item];
    set({ items: newItems });
    
    // Side-effects: emit events
    getUserContext().then(({ sessionId, userId }) => {
      const sourceKindForTelemetry = (() => {
        if (item.source.kind === 'template') return 'template';
        if (item.source.kind === 'catalog') return 'catalog';
        return 'normalized';
      })();
      telemetry.track(telemetry.events.COMPARATOR_ITEM_ADDED, {
        id: item.id,
        sourceKind: sourceKindForTelemetry,
        price: item.priceCop ?? item.priceEstCop ?? null,
        coverageCount: item.coverages.length,
        itemCount: newItems.length,
        sessionId,
        userId
      });

      // Emit COMPARATOR_OPENED once per session when threshold reached
      if (newItems.length >= 2 && sessionId && !comparatorOpenedSessions.has(sessionId)) {
        comparatorOpenedSessions.add(sessionId);
        telemetry.track(telemetry.events.COMPARATOR_OPENED, {
          count: newItems.length,
          sessionId,
          userId,
        });
      }
    });
  },

  remove: (id: string) => {
    const state = get();
    const newItems = state.items.filter(item => item.id !== id);
    
    // Only update if something was actually removed
    if (newItems.length !== state.items.length) {
      const removedItem = state.items.find(item => item.id === id);
      set({ items: newItems });
      
      // Side-effects: emit COMPARATOR_ITEM_REMOVED
      if (removedItem) {
        getUserContext().then(({ sessionId, userId }) => {
          telemetry.track(telemetry.events.COMPARATOR_ITEM_REMOVED, {
            id: removedItem.id,
            sourceKind: removedItem.source.kind,
            price: removedItem.priceCop ?? removedItem.priceEstCop ?? null,
            coverageCount: removedItem.coverages.length,
            itemCount: newItems.length,
            sessionId,
            userId
          });
        });
      }
    }
  },

  clear: () => {
    const state = get();
    // Only emit if there were items to clear
    if (state.items.length > 0) {
      set({ items: [] });
      getUserContext().then(({ sessionId, userId }) => {
        telemetry.track(telemetry.events.COMPARATOR_CLEARED, {
          sessionId,
          userId
        });
      });
    }
  },
}));

// Export selector hooks for convenience
export const useCompareItems = () => useCompareStore(state => state.items);
export const useCompareCount = () => useCompareStore(state => state.count);
export const useCompareIsFull = () => useCompareStore(state => state.isFull);
export const useCompareIsEmpty = () => useCompareStore(state => state.isEmpty);
export const useIsInCompare = (id: string) => useCompareStore(state => state.isInCompare(id));
// Tuple + shallow wrapper (TS-safe)
export const useCompareActions = () =>
  useCompareStore(useShallow(s => [s.add, s.remove, s.clear] as const));
