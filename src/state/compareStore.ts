"use client";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { ComparedPlan } from "@/types/compare";
import { telemetry, getUserContext } from "@/lib/telemetry";

// Idempotency guard per session for COMPARATOR_OPENED
const comparatorOpenedSessions = new Set<string>();

// Feature flag: templates fallback (client-side, build-time substituted)
const isTemplatesFallbackEnabled = (() => {
  const raw = ((await import('@/lib/env')).getPublicEnv().NEXT_PUBLIC_ENABLE_TEMPLATES_FALLBACK ?? process.env.ENABLE_TEMPLATES_FALLBACK);
  if (raw === undefined) return true; // default ON unless explicitly disabled
  const normalized = String(raw).toLowerCase();
  return !["0", "false", "off", "no"].includes(normalized);
})();

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
    
    // Guard: block template items if templates fallback is disabled
    if (!isTemplatesFallbackEnabled && item?.source?.kind === 'template') {
      if (process.env.NODE_ENV !== 'production') {
        try { console.info('[Compare] Template add ignored (fallback disabled)', { id: item?.id }); } catch {}
      }
      return;
    }

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
    
    // Dev-only probe when comparator "opens" (first item added)
    if (process.env.NODE_ENV !== 'production' && state.items.length === 0 && newItems.length > 0) {
      try {
        getUserContext().then(({ sessionId }) => {
          const sid = sessionId || 'dev-session';
          if (!comparatorOpenedSessions.has(sid)) {
            comparatorOpenedSessions.add(sid);
            try { console.info('[Compare] Opened (dev-probe)', { sessionId: sid, itemCount: newItems.length, origin: 'add' }); } catch {}
          }
        });
      } catch {}
    }

    // Side-effects: emit events (opened event now emitted by open/scroll handlers)
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
      // COMPARATOR_OPENED emission moved to UI handlers to include origin and avoid duplicates.
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

// E2E exposure: allow tests to seed compare items deterministically
try {
  if (typeof window !== 'undefined' && ((await import('@/lib/env')).getPublicEnv().NEXT_PUBLIC_E2E_CAPTURE === '1')) {
    (window as any).useCompareStore = useCompareStore;
  }
} catch {}
