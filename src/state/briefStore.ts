
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Brief } from "@/types/brief";
import { ComparedPlan, TemplatePlan } from "@/types/compare";
import { telemetry, getUserContext, normalizeError } from "@/lib/telemetry";
import { backoff } from "@/lib/net/backoff";

type SavingState = 'idle' | 'saving' | 'error';

// Throttle helpers for BRIEF_UPDATED and BRIEF_FIELDS_UPDATED telemetry
let briefUpdatedThrottle: NodeJS.Timeout | null = null;
let briefFieldsUpdatedThrottle: NodeJS.Timeout | null = null;

const trackBriefUpdated = (field?: keyof Brief) => {
  if (briefUpdatedThrottle) {
    clearTimeout(briefUpdatedThrottle);
  }
  briefUpdatedThrottle = setTimeout(async () => {
    const { sessionId, userId } = await getUserContext();
    telemetry.track(telemetry.events.BRIEF_UPDATED, {
      field: field || 'unknown',
      sessionId,
      userId
    });
  }, 700);
};

const trackBriefFieldsUpdated = (brief: Brief, source: Brief['source']) => {
  if (briefFieldsUpdatedThrottle) {
    clearTimeout(briefFieldsUpdatedThrottle);
  }
  briefFieldsUpdatedThrottle = setTimeout(async () => {
    const { sessionId, userId } = await getUserContext();
    const { fieldsFilled, totalFields, fieldNames } = telemetry.metrics.countBriefFields(brief);
    telemetry.track(telemetry.events.BRIEF_FIELDS_UPDATED, {
      fieldsFilled,
      totalFields,
      fieldNames,
      source: source || 'manual',
      sessionId,
      userId,
    });
  }, 500);
};

interface BriefStoreState {
  brief: Brief | null;
  results: ComparedPlan[];
  templates: TemplatePlan[];
  
  // meta
  saving: SavingState;
  error?: string;
  serverVersion?: number;
  lastSavedAt?: string; // ISO
  dirtyFields: Set<keyof Brief>;
  authRequired: boolean; // true when user is not authenticated
  
  // actions
  setBrief: (b: Brief) => void;
  updateBrief: (patch: Partial<Brief>, opts?: { field?: keyof Brief }) => void;
  applyBrief: () => void;
  clearBrief: () => void;
  setResults: (r: ComparedPlan[]) => void;
  setTemplates: (t: TemplatePlan[]) => void;
  
  // step-3 hooks (stubs for now)
  loadFromServer: (userId: string, sessionId: string) => Promise<void>;
  // Save with options (e.g., noBackoff for immediate UI flows)
  // Returns true on success (or if skipped due to authRequired), false on failure
  saveNow: (opts?: { noBackoff?: boolean; fieldName?: keyof Brief; stage?: string }) => Promise<boolean>;
}

// Debounce timer management
const saveTimers = new Map<string, NodeJS.Timeout>();

// Derived selectors interface
interface BriefStoreDerived {
  isDirty: boolean;
  isSaving: boolean;
  isApplied: boolean;
  hasCatalogResults: boolean;
}

type BriefStoreWithDerived = BriefStoreState & BriefStoreDerived;

const initialState = {
  brief: null,
  results: [],
  templates: [],
  saving: 'idle' as SavingState,
  error: undefined,
  serverVersion: undefined,
  lastSavedAt: undefined,
  dirtyFields: new Set<keyof Brief>(),
  authRequired: false,
};

export const useBriefStore = create<BriefStoreWithDerived>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Derived selectors as getters
      get isDirty() {
        const state = get();
        return state.dirtyFields.size > 0 || (state.brief?.version ?? 0) !== (state.serverVersion ?? 0);
      },
      
      get isSaving() {
        return get().saving === 'saving';
      },
      
      get isApplied() {
        return get().brief?.isApplied === true;
      },
      
      get hasCatalogResults() {
        return get().results.length > 0;
      },

      // Actions
      setBrief: (brief: Brief) => {
        set({
          brief,
          dirtyFields: new Set(),
          serverVersion: brief.version,
          authRequired: false, // Clear auth required when setting a brief
        });
      },

      updateBrief: (patch: Partial<Brief>, opts?: { field?: keyof Brief }) => {
        const state = get();
        if (!state.brief) return;

        // Prevent redundant renders by ignoring no-op updates
        const noChange = Object.entries(patch).every(([k, v]) => (state.brief as any)[k] === v);
        if (noChange) return;

        const updatedBrief = { ...state.brief, ...patch };
        const newDirtyFields = new Set(state.dirtyFields);
        
        if (opts?.field) {
          newDirtyFields.add(opts.field);
        }

        set({
          brief: updatedBrief,
          dirtyFields: newDirtyFields,
        });

        // Step-2 analytics: BRIEF_UPDATED (throttled)
        trackBriefUpdated(opts?.field);
        // Emit BRIEF_FIELDS_UPDATED (throttled) with field coverage counts
        try {
          trackBriefFieldsUpdated(updatedBrief, updatedBrief.source);
        } catch {}

        // If this update originated from paste hydration, mark completion once fields exist
        try {
          if (updatedBrief?.source === 'paste') {
            const w = typeof window !== 'undefined' ? (window as any) : undefined;
            const start = w?.__pasteToBriefStartTs;
            const chars = w?.__pasteToBriefChars;
            const hasAnyField = Boolean(
              updatedBrief.category ||
              updatedBrief.maxBudgetCop != null ||
              (updatedBrief.mustHaveCoverages && updatedBrief.mustHaveCoverages.length > 0) ||
              updatedBrief.clientPersona ||
              updatedBrief.notes
            );
            if (typeof start === 'number' && hasAnyField) {
              const ms = Math.max(0, Date.now() - start);
              telemetry.track(telemetry.events.PASTE_TO_BRIEF_COMPLETED, { chars, ms });
              if (w?.__pasteToBriefTimeoutId) { try { clearTimeout(w.__pasteToBriefTimeoutId); } catch {} }
              w.__pasteToBriefStartTs = null;
              w.__pasteToBriefChars = null;
              w.__pasteToBriefTimeoutId = null;
            }
          }
        } catch {}

        // Debounced autosave - 700ms delay
        const sessionId = state.brief.sessionId;
        if (sessionId) {
          // Cancel existing timer for this session
          const existingTimer = saveTimers.get(sessionId);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          // Set new timer
          const timer = setTimeout(() => {
            saveTimers.delete(sessionId);
            // Telemetry: autosave enqueued
            getUserContext().then(({ sessionId, userId }) => {
              telemetry.track('brief.autosave.enqueued', { field: opts?.field || 'unknown', sessionId, userId });
            }).catch(() => {});
            get().saveNow({ fieldName: opts?.field }).catch(() => {});
          }, 700);

          saveTimers.set(sessionId, timer);
        }
      },

      applyBrief: () => {
        const state = get();
        if (!state.brief) return;

        set({
          brief: { ...state.brief, isApplied: true },
        });

        // Step-2 analytics: BRIEF_APPLIED
        getUserContext().then(({ sessionId, userId }) => {
          telemetry.track(telemetry.events.BRIEF_APPLIED, {
            sessionId,
            userId
          });
        });
      },

      clearBrief: () => {
        // Preserve authRequired state when clearing
        const currentAuthRequired = get().authRequired;
        set({
          ...initialState,
          authRequired: currentAuthRequired,
        });
      },

      setResults: (results: ComparedPlan[]) => {
        set({ results });
      },

      setTemplates: (templates: TemplatePlan[]) => {
        set({ templates });
      },

      // Server sync methods
      loadFromServer: async (userId: string, sessionId: string) => {
        let guestModeDetected = false;
        
        try {
          const response = await fetch(`/api/briefs?sessionId=${sessionId}`);
          
          if (!response.ok) {
            throw new Error(`Failed to load brief: ${response.status}`);
          }

          const data = await response.json();
          
          // Check if we're in guest mode
          if (data.auth === false) {
            guestModeDetected = true;
            set({
              authRequired: true,
              saving: 'idle',
              error: undefined,
            });
            
            // Track guest mode entry (one-time)
            telemetry.track(telemetry.events.BRIEF_LOAD_GUEST, { sessionId });
            
            // Don't make any further requests - we're in guest mode
            return;
          }
          
          const serverBrief = data.brief as Brief | null;

          if (serverBrief) {
            set({
              brief: serverBrief,
              serverVersion: serverBrief.version,
              lastSavedAt: serverBrief.updatedAt,
              dirtyFields: new Set(),
              error: undefined,
              authRequired: false,
            });
          }

          // Try to load local draft from localStorage
          const draftKey = `briki-brief-draft:${sessionId}`;
          try {
            const draft = localStorage.getItem(draftKey);
            if (draft) {
              const parsedDraft = JSON.parse(draft);
              // If we have a local draft and no server brief, use it
              if (!serverBrief && parsedDraft) {
                set({ brief: parsedDraft });
              }
              // Clean up the draft
              localStorage.removeItem(draftKey);
            }
          } catch (error) {
            console.warn('Failed to load draft from localStorage:', error);
          }
        } catch (error) {
          console.error('Failed to load from server:', error);
          
          // If we got a 401, we're in guest mode
          if (error instanceof Error && error.message.includes('401')) {
            set({
              authRequired: true,
              saving: 'idle',
              error: undefined,
            });
            
            if (!guestModeDetected) {
              telemetry.track(telemetry.events.BRIEF_LOAD_GUEST, { sessionId });
            }
            return;
          }
          
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load brief',
          });
        }
      },

      saveNow: async (options?: { noBackoff?: boolean; fieldName?: keyof Brief; stage?: string }) => {
        const state = get();
        if (!state.brief || !state.isDirty) return true;
        
        // If auth required (guest mode), skip network save
        if (state.authRequired) {
          // Update local state to show we can't save
          set({ 
            saving: 'idle',
            error: undefined,
          });
          
          // Store locally as draft
          const draftKey = `briki-brief-draft:${state.brief.sessionId}`;
          try {
            localStorage.setItem(draftKey, JSON.stringify(state.brief));
          } catch (error) {
            console.warn('Failed to save draft locally:', error);
          }
          
          return true;
        }

        set({ saving: 'saving', error: undefined });

        try {
          // Step 1: Get current server copy to check for conflicts
          const getResponse = await fetch(`/api/briefs?sessionId=${state.brief.sessionId}`);
          
          if (getResponse.ok) {
            const data = await getResponse.json();
            const serverBrief = data.brief as Brief | null;

            // Step 2: Check for conflicts
            if (serverBrief && serverBrief.version > (state.brief.version ?? 0)) {
              // Conflict detected - merge strategy:
              // - Server wins for updatedAt and version
              // - Client wins for fields in dirtyFields
              // - Union docRefs by ref
              const mergedBrief: Brief = {
                ...serverBrief,
                ...state.brief,
                updatedAt: serverBrief.updatedAt,
                version: serverBrief.version,
                // Merge fields that are dirty on client
                ...Array.from(state.dirtyFields).reduce((acc, field) => {
                  acc[field] = state.brief![field];
                  return acc;
                }, {} as any),
                // Union docRefs
                docRefs: state.brief.docRefs && serverBrief.docRefs
                  ? Array.from(new Map(
                      [...serverBrief.docRefs, ...state.brief.docRefs]
                        .map(ref => [ref.ref, ref])
                    ).values())
                  : state.brief.docRefs || serverBrief.docRefs,
              };
              
              // Mark as conflicted using a property that TypeScript won't complain about
              (mergedBrief as any).__conflicted = true;

              // Update state with merged brief
              set({ brief: mergedBrief });
            }
          }

          // Step 3: Increment version
          const briefToSave = {
            ...get().brief!,
            version: (get().brief!.version ?? 0) + 1,
            updatedAt: new Date().toISOString(),
          };

          // Step 4: Save to server with conflict handling
          let saveResponse: any;
          try {
            saveResponse = await backoff(
              async () => {
                const res = await fetch('/api/briefs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ brief: briefToSave }),
                });

                if (!res.ok) {
                  const error = new Error(`Save failed: ${res.status}`);
                  (error as any).status = res.status;
                  throw error;
                }

                return res.json();
              },
              { maxAttempts: 5, base: 500, factor: 2, jitter: 0.2 }
            );
          } catch (error: any) {
            // Handle 409 conflict with one retry
            if (error?.status === 409) {
              const { sessionId, userId } = await getUserContext();
              
              // Track conflict detected
              telemetry.track(telemetry.events.BRIEF_SAVE_CONFLICT, {
                sessionId,
                userId
              });

              try {
                // Get latest server brief
                const conflictResponse = await fetch(`/api/briefs?sessionId=${state.brief.sessionId}`);
                if (!conflictResponse.ok) {
                  throw new Error(`Failed to fetch server brief: ${conflictResponse.status}`);
                }

                const conflictData = await conflictResponse.json();
                const serverBrief = conflictData.brief as Brief;

                if (serverBrief) {
                  // Merge with same rules as existing conflict detection
                  const mergedBrief: Brief = {
                    ...serverBrief,
                    ...state.brief,
                    updatedAt: serverBrief.updatedAt,
                    version: serverBrief.version,
                    // Merge fields that are dirty on client
                    ...Array.from(state.dirtyFields).reduce((acc, field) => {
                      acc[field] = state.brief![field];
                      return acc;
                    }, {} as any),
                    // Union docRefs
                    docRefs: state.brief.docRefs && serverBrief.docRefs
                      ? Array.from(new Map(
                          [...serverBrief.docRefs, ...state.brief.docRefs]
                            .map(ref => [ref.ref, ref])
                        ).values())
                      : state.brief.docRefs || serverBrief.docRefs,
                  };
                  
                  // Mark as conflicted
                  (mergedBrief as any).__conflicted = true;

                  // Prepare retry with merged brief
                  const retryBrief = {
                    ...mergedBrief,
                    version: mergedBrief.version + 1,
                    updatedAt: new Date().toISOString(),
                  };

                  // Track retry attempt
                  telemetry.track(telemetry.events.BRIEF_SAVE_RETRY, {
                    sessionId,
                    userId
                  });

                  // Single retry attempt
                  const retryResponse = await fetch('/api/briefs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ brief: retryBrief }),
                  });

                  if (!retryResponse.ok) {
                    throw new Error(`Retry save failed: ${retryResponse.status}`);
                  }

                  saveResponse = await retryResponse.json();
                  
                  // Track successful conflict resolution
                  telemetry.track(telemetry.events.BRIEF_SAVE_CONFLICT_RESOLVED, {
                    sessionId,
                    userId
                  });
                } else {
                  throw new Error('No server brief found for conflict resolution');
                }
              } catch (retryError) {
              console.error('Conflict resolution failed:', retryError);
              set({
                saving: 'error',
                error: retryError instanceof Error ? retryError.message : 'Conflict resolution failed',
              });
              return false;
              }
            } else {
              // Re-throw non-409 errors
              throw error;
            }
          }

          const savedBrief = saveResponse.brief as Brief;

          // Step 5: Update state on success
          set({
            brief: savedBrief,
            saving: 'idle',
            serverVersion: savedBrief.version,
            lastSavedAt: savedBrief.updatedAt,
            dirtyFields: new Set(),
            error: undefined,
          });
          // Telemetry: autosave success
          try {
            const { sessionId, userId } = await getUserContext();
            telemetry.track('brief.autosave.success', { field: options?.fieldName || 'unknown', sessionId, userId });
          } catch {}
          return true;
        } catch (error: any) {
          console.error('Save failed:', error);
          set({
            saving: 'error',
            error: error?.message || 'Save failed',
          });
          // Telemetry: autosave fail (normalized, no PII)
          try {
            const err = normalizeError(error, options?.stage || 'autosave');
            const { sessionId, userId } = await getUserContext();
            telemetry.track('brief.autosave.fail', { field: options?.fieldName || 'unknown', ...err, sessionId, userId });
          } catch {}
          
          // Don't retry on client errors (4xx)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          
          // For other errors, could implement additional retry logic here
          return false;
        }
      },
    }),
    {
      name: 'briki-brief-store',
      skipHydration: true,
      // Custom serialization to handle Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert dirtyFields array back to Set
          if (parsed.state?.dirtyFields && Array.isArray(parsed.state.dirtyFields)) {
            parsed.state.dirtyFields = new Set(parsed.state.dirtyFields);
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Convert Set to array for serialization
          const serializable = {
            ...value,
            state: {
              ...value.state,
              dirtyFields: Array.from(value.state.dirtyFields || []),
            },
          };
          localStorage.setItem(name, JSON.stringify(serializable));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
