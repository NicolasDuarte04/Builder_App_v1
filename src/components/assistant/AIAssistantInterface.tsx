"use client";

/*
Diagnostic notes for Analyze Policy PDF modal (read-only audit):

1) Data source for analysis data (API / hook):
   - Analysis is produced by the API `POST /api/ai/analyze-policy`.
   - The `PDFUpload` component posts the selected PDF to that endpoint and calls `onAnalysisComplete(result.analysis)`.
   - Here, `handleAnalysisComplete` sets `policyAnalysis` state, which opens the analysis modal.
   - Additionally, `PolicyHistory` can load a saved upload and call `onViewAnalysis` (sets `policyAnalysis`).

2) Current type shape for extracted items:
   - There is no dedicated per-item interface for bullets. The UI renders arrays of strings from the analysis:
     - `analysis.keyFeatures: string[]`
     - `analysis.recommendations: string[]`
     - `analysis.coverage.exclusions: string[]`
     - `analysis.coverage.limits: Record<string, number>`
     - `analysis.coverage.deductibles: Record<string, number>`
   - Reference interface (from `PolicyAnalysisDisplay.tsx` at time of audit):
     interface PolicyAnalysis {
       policyType: string;
       premium: { amount: number; currency: string; frequency: string };
       coverage: { limits: Record<string, number>; deductibles: Record<string, number>; exclusions: string[]; geography?: string; claimInstructions?: string[] };
       policyDetails: { policyNumber?: string; effectiveDate?: string; expirationDate?: string; insured: string[] };
       insurer?: { name?: string; contact?: string; emergencyLines?: string[] };
       premiumTable?: { label?: string; year?: string | number; plan?: string; amount?: number | string }[];
       keyFeatures: string[];
       recommendations: string[];
       riskScore: number;
       riskJustification?: string;
       sourceQuotes?: Record<string, string>;
       redFlags?: string[];
       missingInfo?: string[];
     }

3) Do items include page numbers today?
   - No. Bulleted items are plain strings; there is no `page` field in arrays. The backend schema (Zod) also has no per-item page number fields.

4) Existing PDF viewer route that accepts #page=X?
   - No in-app PDF viewer route/component was found. The UI links to the original PDF URL (`Ver PDF original`).
   - If the external browser viewer supports `#page=`, anchors may work, but there is no dedicated internal viewer.
*/

import type React from "react";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ArrowUp, FileText, Shield, ArrowLeftRight, Plus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { useBrikiChat } from "@/hooks/useBrikiChat";
import { MessageRenderer } from "./MessageRenderer";
// PDFUpload removed - analyzer now uses in-card panel
import { PolicyAnalysisDisplay } from "./PolicyAnalysisDisplay";
import { PolicyHistory } from "./PolicyHistory";
import { X, Sidebar, MessageSquare, Layout } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePlanResults } from "@/contexts/PlanResultsContext";
import { PlanResultsSidebar } from "./PlanResultsSidebar";
import { LayoutModeToggle } from "./LayoutModeToggle";
import { PlanPinObserver } from "./PlanPinObserver";
import { CategoryFallbackObserver } from "./CategoryFallbackObserver";
import { useUIOverlay } from "@/state/uiOverlay";
import { ResultsToggle } from "./ResultsToggle";
import { useProposal, useUiPhase } from "@/state/proposal";
import { QuickActionBar } from "./QuickActionBar";
import { useUI } from "@/state/ui";
import { useAnalyzer } from "@/state/analyzer";
import { telemetry, getUserContext } from "@/lib/telemetry";
import { now, since } from "@/lib/time";
import type { Brief } from "@/types/brief";
import { useBriefStore } from "@/state/briefStore";
import { XIcon } from "lucide-react";
import { validateAndNormalizeBrief } from '@/lib/validate/brief';
import { ReparseConfirmDialog } from '@/components/brief/ReparseConfirmDialog';
import { ResultsStatusBanner } from '@/components/results/ResultsStatusBanner';
import { Comparator } from '@/components/compare/Comparator';
import { useCompareStore } from '@/state/compareStore';
import { useCompareUI } from '@/state/compareUI';
import { buildPlanFiltersFromBrief } from '@/lib/briefPromptBuilder';
import { searchPlans } from '@/lib/plans-client';
import { buildSmartTemplates } from '@/lib/templates/buildSmartTemplates';
import { useIsBriefCollapsed, useUILayoutStore } from '@/state/uiLayoutStore';
import { getFFIncredibleBrief, getFFLongPasteGuard, isNoResultsChatNoticeEnabled } from '@/lib/flags';
import { useAnalyzerUI } from '@/state/analyzerUI';
import { formatCurrency } from "@/lib/utils";
import { pickBriefWhitelist } from '@/lib/briefWhitelist';

// Render-safe telemetry dedupe (module-level) for Assistant UI
const ASSISTANT_TELEMETRY_KEYS = new Set<string>();
let ASSISTANT_TELEMETRY_TOKEN = 0; // increment on chat restart / new session lifecycle

function markAndShouldSkipAssistant(eventName: string, signature: string) {
  const key = `${ASSISTANT_TELEMETRY_TOKEN}|${eventName}|${signature}`;
  if (ASSISTANT_TELEMETRY_KEYS.has(key)) return true;
  ASSISTANT_TELEMETRY_KEYS.add(key);
  return false;
}

interface AIAssistantInterfaceProps {
  isLoading?: boolean;
  onboardingData?: Partial<{
    insuranceType: string;
    coverageFor: string;
    budget: string;
    city: string;
  }>;
  mode?: "full" | "embedded";
  showWelcome?: boolean;
  initialSeed?: { brief: any; shortlist: any[] } | null;
  onAnalyzePlan?: (plan: any) => void;
  onToggleSelect?: (plan: any) => void;
  isSelected?: (planId: string) => boolean;
  onAppendMessage?: (fn: (msg: any) => void) => void;
}

// Manual override helper for the brief panel.
// Use 'expanded' for user-forced open, 'collapsed' for user-forced close, null to clear.
export const setManualOverride = (mode: 'expanded' | 'collapsed' | null) => {
  try {
    const store = useUILayoutStore.getState();
    if (mode === 'expanded') {
      store.setBriefManualOpen();
    } else if (mode === 'collapsed') {
      store.setBriefManualClosed();
    } else {
      store.clearBriefManualOverride();
    }
  } catch {}
};

function WelcomeHero({
  onStartBrief,
  onAnalyzePdf,
}: {
  onStartBrief: () => void;
  onAnalyzePdf: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-center">
        <span className="text-foreground">
          {t("assistant.welcome_title").replace("Briki", "")}
        </span>{" "}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400">
          Briki
        </span>
      </h1>
      {/* no subtitle, no buttons */}
    </div>
  );
}

export function AIAssistantInterface(props: AIAssistantInterfaceProps) {
  return (
    <AIAssistantInterfaceInner
      isLoading={props.isLoading}
      onboardingData={props.onboardingData}
      mode={props.mode}
      showWelcome={props.showWelcome}
      initialSeed={props.initialSeed}
      onAnalyzePlan={props.onAnalyzePlan}
      onToggleSelect={props.onToggleSelect}
      isSelected={props.isSelected}
      onAppendMessage={props.onAppendMessage}
    />
  );
}

function AIAssistantInterfaceInner({
  isLoading = false,
  onboardingData = {},
  mode = "full",
  showWelcome = true,
  initialSeed = null,
  onAnalyzePlan,
  onToggleSelect,
  isSelected,
  onAppendMessage,
}: AIAssistantInterfaceProps) {
  // Utility variables for embedded vs full-screen mode
  const isEmbedded = mode === "embedded";
  const railPad = isEmbedded ? "px-4 md:px-6" : "px-6 md:px-8";
  const railWidth = isEmbedded ? "max-w-none w-full mx-0" : "mx-auto max-w-3xl";

  const { t, language } = useTranslation();
  const searchParams = useSearchParams();
  const {
    currentResults,
    isRightPanelOpen,
    hideRightPanel,
    isDualPanelMode,
    setDualPanelMode,
    setSidebarOpen,
    showPanelWithPlans,
    clearResults,
  } = usePlanResults();

  // Helper function to create context message from onboarding data
  const createContextMessage = (data: any) => {
    const parts = [];

    if (data.insuranceType) {
      const label = t("assistant.context.insuranceType");
      // Use the onboarding option label if available, otherwise fallback to raw value
      const insuranceLabel = t(`onboarding.options.${data.insuranceType}.label`) || data.insuranceType;
      parts.push(`${label}: ${insuranceLabel}`);
    }
    if (data.coverageFor) {
      const label = t("assistant.context.coverage");
      // Use the onboarding option label if available, otherwise fallback to raw value
      const coverageLabel = t(`onboarding.options.${data.coverageFor}.label`) || data.coverageFor;
      parts.push(`${label}: ${coverageLabel}`);
    }
    if (data.budget) {
      const label = t("assistant.context.budget");
      // Use the onboarding option label if available, otherwise fallback to raw value
      const budgetLabel = t(`onboarding.options.${data.budget}.label`) || data.budget;
      parts.push(`${label}: ${budgetLabel}`);
    }
    if (data.city) {
      const label = t("assistant.context.city");
      parts.push(`${label}: ${data.city}`);
    }

    if (parts.length > 0) {
      const contextPrefix = t("assistant.context.prefix");
      const contextSuffix = t("assistant.context.suffix");
      return `${contextPrefix}: ${parts.join(", ")}. ${contextSuffix}`;
    }

    return "";
  };

  // Disable onboarding data loading - start with clean state
  const [loadedOnboardingData, setLoadedOnboardingData] = useState(() => {
    // Always return empty object to start with clean state
    console.log("🎯 Starting with clean state - no onboarding data");
    return {};
  });

  // Create initial messages - always start with empty array for clean state
  const [initialMessages] = useState(() => {
    // Always return empty array - no pre-loaded messages or context
    console.log("🎯 Starting with clean chat - no initial messages");
    return [];
  });

  // Track if we've seeded the chat
  const didSeedRef = useRef(false);

  // Get proposal state for quick actions (scoped selectors only)
  const selected = useProposal((s) => s.selected);
  const setUiPhase = useProposal((s) => s.setUiPhase);
  const brief = useProposal((s) => s.brief);
  const shortlist = useProposal((s) => s.shortlist);
  const uiPhase = useUiPhase();
  // Brief store: subscribe to primitive fields only
  const isBriefApplied = useBriefStore((s) => s.isApplied);
  const briefBudget = useBriefStore((s) => s.brief?.maxBudgetCop);
  const briefMustHaves = useBriefStore((s) => s.brief?.mustHaveCoverages);
  const briefCategory = useBriefStore((s) => s.brief?.category);
  const briefNotes = useBriefStore((s) => s.brief?.notes);
  // Memoize banner details from primitives
  const briefBannerDetails = useMemo(() => {
    const parts: string[] = [];
    if (briefCategory) {
      parts.push(String(briefCategory));
    }
    if (typeof briefBudget === 'number' && Number.isFinite(briefBudget)) {
      const localeMap: Record<string, string> = { en: 'en-US', es: 'es-CO' };
      const localeTag = localeMap[language] || language;
      parts.push(`${t('common.lessOrEqual')} ${formatCurrency(briefBudget, 'COP', localeTag)}`);
    }
    const mh = briefMustHaves || [];
    if (Array.isArray(mh) && mh.length > 0) {
      parts.push(mh.join(', '));
    }
    if (briefNotes && String(briefNotes).trim().length > 0) {
      parts.push(t('assistant.brief_context_notes') as string);
    }
    return parts.join(' · ');
  }, [briefCategory, briefBudget, briefMustHaves, briefNotes, language, t]);
  // Provide Comparator with a stable brief reference based on essential fields
  const briefForComparison = useMemo(() => useBriefStore.getState().brief, [briefBudget, briefMustHaves, briefCategory]);

  // Compare store item count (primitive selector to avoid array subscriptions)
  const compareItemsCount = useCompareStore(state => state.items.length);
  const isComparatorOpen = useCompareUI(s => s.isOpen);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: chatLoading,
    error: chatError,
    clearChat,
    appendAssistantMessage,
    setMessages,
  } = useBrikiChat(initialMessages);

  // Inject brief constraints as a system message before next chat send
  const injectBriefConstraintsIfApplied = useCallback(async () => {
    if (!isBriefApplied) return;
    const b = useBriefStore.getState().brief;
    if (!b) return;
    const constraints = {
      category: b.category || null,
      maxBudgetCop: typeof b.maxBudgetCop === 'number' && Number.isFinite(b.maxBudgetCop) ? b.maxBudgetCop : null,
      mustHaveCoverages: Array.isArray(b.mustHaveCoverages) ? b.mustHaveCoverages : [],
      notes: b.notes || '',
    } as const;
    // Non-empty fields count from the injected constraints only
    const { fieldsFilled } = telemetry.metrics.countBriefFields(constraints as any);
    const fieldCount = fieldsFilled;
    if (fieldCount === 0) return;
    setMessages((prev: any[]) => [
      ...prev,
      {
        id: `sys-brief-constraints-${Date.now()}`,
        role: 'system' as const,
        content: JSON.stringify({ type: 'brief_constraints', constraints, locale: language }),
      },
    ]);
    try {
      const { sessionId, userId } = await getUserContext();
      const submitId = `submit_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      telemetry.track(telemetry.events.BRIEF_INJECTED_INTO_TOOL, {
        tool: 'chat',
        fieldCount,
        sessionId,
        userId,
        submitId,
      });
    } catch {}
  }, [isBriefApplied, language, setMessages]);

  // Brief collapse state from store
  const setBriefCollapsed = useUILayoutStore((s) => s.setBriefCollapsed);
  // Strict flow start definition used for layout/UX decisions
  const flowStartedStrict =
    uiPhase === 'results' ||
    uiPhase === 'analyzing_pdf' ||
    uiPhase === 'processing';

  // Computed collapse mode: welcome → inplace, otherwise window
  const collapseMode: 'inplace' | 'window' = uiPhase === 'welcome' ? 'inplace' : 'window';

  // QA probe (temporary): log mode changes
  useEffect(() => {
    try { console.debug('[brief] collapseMode', collapseMode, 'collapsed?', useUILayoutStore.getState().isBriefCollapsed); } catch {}
  }, [collapseMode]);

  // Reset manual override when we leave the welcome phase
  const lastUiPhaseRef = useRef(uiPhase);
  useEffect(() => {
    if (lastUiPhaseRef.current === 'welcome' && uiPhase !== 'welcome') {
      setManualOverride(null);
    }
    lastUiPhaseRef.current = uiPhase;
  }, [uiPhase]);

  const briefManualOverride = useUILayoutStore((s) => s.briefManualOverride);
  const isBriefCollapsed = useIsBriefCollapsed();
  const lastCollapsedRef = useRef(isBriefCollapsed);
  
  // Optional: last telemetry payload to prevent spam (normalized brief layout event)
  const lastBriefLayoutEventRef = useRef<{ collapsed: boolean; reason: 'auto' | 'manual' } | null>(null);

  // DEV-ONLY: Fuse to prevent oscillation from rapid toggles
  // Tracks state changes in 1s window, ignores if > 5 flips
  // Has NO impact in production builds
  const devFuseRef = useRef<{ timestamps: number[]; isTripped: boolean }>({ 
    timestamps: [], 
    isTripped: false 
  });

  // Safe, one-time seeding (fixes "setState during render")
  useEffect(() => {
    if (!didSeedRef.current && initialSeed && initialSeed.shortlist?.length && initialSeed.brief) {
      const seedContent = JSON.stringify({
        type: "insurance_plans",
        brief: initialSeed.brief,
        plans: initialSeed.shortlist,
        message: `Con tu brief (${initialSeed.brief.category_code}, máx $${initialSeed.brief.budget_high.toLocaleString()}, imprescindibles: ${initialSeed.brief.must_haves.join(", ")}), aquí tienes las 3 mejores opciones que encontré:`,
      });
      appendAssistantMessage(seedContent);
      didSeedRef.current = true;
      setUiPhase('results');
    }
  }, [initialSeed, appendAssistantMessage, setUiPhase]);

  // Expose appendAssistantMessage to parent
  useEffect(() => {
    if (onAppendMessage) {
      onAppendMessage(appendAssistantMessage);
    }
  }, [onAppendMessage, appendAssistantMessage]);

  // Handle briki:analysis-prep event to inject prelude message
  useEffect(() => {
    const onPrep = () => {
      // If portal flag is enabled, never inject legacy prep card
      try {
        const { ENABLE_BRC_PORTAL } = require('@/lib/featureFlags');
        if (ENABLE_BRC_PORTAL) return;
      } catch {}
      // ⛔️ In portal modes, the Portal UI owns the prep; skip legacy chat card
      try {
        const lm = useUI.getState().layoutMode;
        if (lm === 'analysis_portal_prep' || lm === 'analysis_running' || lm === 'analysis_results') {
          return; // do nothing in portal modes
        }
      } catch {}

      const { file } = useAnalyzer.getState();
      // Replace any existing analysis_prep message to avoid stacking
      setMessages((prev: any[]) => {
        const filtered = prev.filter((m: any) => {
          if (m.role !== 'assistant') return true;
          try {
            const p = JSON.parse(m.content || '{}');
            return p?.type !== 'analysis_prep';
          } catch { return true; }
        });
        return [
          ...filtered,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant' as const,
            content: JSON.stringify({ type: 'analysis_prep', fileName: file?.name, fileSize: file?.size })
          }
        ];
      });
      // Scroll to bottom to reveal the prep card
      try {
        requestAnimationFrame(() => scrollRegionRef.current?.scrollTo({ top: scrollRegionRef.current.scrollHeight, behavior: 'smooth' }));
      } catch {}
    };
    window.addEventListener("briki:analysis-prep", onPrep);
    return () => window.removeEventListener("briki:analysis-prep", onPrep);
  }, [appendAssistantMessage, setMessages]);

  // Handle briki:portal-prep-narration event to inject minimal narration message
  useEffect(() => {
    const onPortalNarration = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.fileName) return;
      
      // Check if we already have a portal prep narration for this file
      setMessages(prev => {
        const hasNarration = prev.some(m => {
          if (m.role !== "assistant") return false;
          try {
            const parsed = JSON.parse(m.content as string);
            return parsed?.type === "portal_prep_narration" && parsed?.fileName === detail.fileName;
          } catch {
            return false;
          }
        });
        
        if (!hasNarration) {
          const narrationMessage = {
            id: `narration-${Date.now()}`,
            role: "assistant" as const,
            content: JSON.stringify({
              type: "portal_prep_narration",
              fileName: detail.fileName,
              fileSize: detail.fileSize
            })
          };
          return [...prev, narrationMessage];
        }
        return prev;
      });
    };
    window.addEventListener("briki:portal-prep-narration", onPortalNarration);
    return () => window.removeEventListener("briki:portal-prep-narration", onPortalNarration);
  }, [setMessages]);

  // Detect comparison messages to allow wider chat area when sidebar is open
  // Declare this BEFORE any early returns to preserve hook order
  const hasComparisonMessage = useMemo(() => {
    return messages.some((m) => {
      if (m.role !== "assistant") return false;
      try {
        const parsed = JSON.parse(m.content as string);
        return parsed?.type === "comparison";
      } catch {
        return false;
      }
    });
  }, [messages]);

  const { data: session } = useSession();
  const [userId, setUserId] = useState<string>(""); // Initialize as empty string
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showUploadAnimation, setShowUploadAnimation] = useState(false);
  const [activeCommandCategory, setActiveCommandCategory] = useState<
    string | null
  >(null);
  const [policyAnalysis, setPolicyAnalysis] = useState<any>(null);
  const [isAnalysisDocked, setIsAnalysisDocked] = useState(false);
  const [showPolicyHistory, setShowPolicyHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(0);

  // Global overlay coordination
  const overlay = useUIOverlay();

  // Phase text for status banner
  const phaseText =
    uiPhase === 'collecting_brief' ? t("assistant.status.collecting_brief") :
    uiPhase === 'analyzing_pdf'    ? t("assistant.status.analyzing_pdf") :
    uiPhase === 'processing'       ? t("assistant.status.processing") :
    null;

  // Scroll only when a new message arrives
  useEffect(() => {
    const el = scrollRegionRef.current;
    if (!el) return;
    if (messages.length > prevCountRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  // Analyzer now handled by in-card panel - no modal needed

  // Set userId from session when available
  useEffect(() => {
    if (session?.user) {
      const sessionUser = session.user as any;
      if (sessionUser.id) {
        setUserId(sessionUser.id);
        if (process.env.NODE_ENV !== 'production') {
          console.log("🔐 User ID set from session:", sessionUser.id);
        }
      } else if (sessionUser.email) {
        // Fallback to email if no ID
        setUserId(sessionUser.email);
        if (process.env.NODE_ENV !== 'production') {
          console.log("📧 Using email as user ID:", sessionUser.email);
        }
      }
    } else {
      // For chat functionality without auth, use a session-based ID
      const sessionId = `guest-${Date.now()}`;
      setUserId(sessionId);
      if (process.env.NODE_ENV !== 'production') {
        console.log("👤 Using guest session ID:", sessionId);
      }
    }
  }, [(session?.user as any)?.id, (session?.user as any)?.email]);

  // Clear in-memory analysis if session user changes (sign-out or switch account)
  useEffect(() => {
    // When user signs out or switches, drop any existing analysis to prevent reuse of stale upload_id
    setPolicyAnalysis(null);
  }, [(session?.user as any)?.id]);

  // Inject onboarding context when component mounts and has data
  const onboardingDataKey = useMemo(() => {
    if (!onboardingData) return '';
    return Object.keys(onboardingData).sort().map(k => `${k}:${(onboardingData as any)[k]}`).join('|');
  }, [onboardingData]);
  
  useEffect(() => {
    if (
      onboardingData &&
      Object.keys(onboardingData).length > 0 &&
      messages.length === 0
    ) {
      console.log("🎯 Injecting onboarding context:", onboardingData);

      // Create a context message based on onboarding data
      const contextMessage = createContextMessage(onboardingData);

      // Note: We can't directly append to the chat, but the context will be used
      // when the user starts chatting. The AI will have access to this context.
      console.log("📝 Context message created:", contextMessage);

      // Telemetry: assistant context applied (chat path)
      (async () => {
        try {
          const { sessionId, userId } = await getUserContext();
          const fields = Object.keys(onboardingData).filter(
            (k) => (onboardingData as any)[k] !== undefined && (onboardingData as any)[k] !== null
          );
          const sig = fields.sort().join('|') || 'none';
          if (!markAndShouldSkipAssistant(telemetry.events.ASSISTANT_CONTEXT_APPLIED, sig)) {
            telemetry.track(telemetry.events.ASSISTANT_CONTEXT_APPLIED, {
              fields,
              sessionId,
              userId,
            });
          }
        } catch {}
      })();
    }
  }, [onboardingDataKey, messages.length, language]);

  // Analyzer now handled by in-card panel - no URL parameters or events needed

  // Telemetry: banner shown (throttled once per sessionId)
  useEffect(() => {
    if (!isBriefApplied) return;
    (async () => {
      try {
        const { sessionId, userId } = await getUserContext();
        const sig = `session:${sessionId}`;
        if (!markAndShouldSkipAssistant(telemetry.events.BRIEF_CONTEXT_BANNER_SHOWN, sig)) {
          telemetry.track(telemetry.events.BRIEF_CONTEXT_BANNER_SHOWN, { sessionId, userId });
        }
      } catch {}
    })();
  }, [isBriefApplied]);

  // Auto-collapse brief when right panel opens or comparator has ≥2 items
  useEffect(() => {
    // Gate: never window-collapse while in welcome (inplace mode)
    if (collapseMode !== 'window') return;

    // Debounce rapid changes
    const timeoutId = setTimeout(() => {
      // DEV-ONLY: Check fuse to prevent oscillation
      if (process.env.NODE_ENV === 'development') {
        const now = Date.now();
        const fuse = devFuseRef.current;
        
        // Clean up timestamps older than 1 second
        fuse.timestamps = fuse.timestamps.filter(t => now - t < 1000);
        
        // Check if we've had too many flips
        if (fuse.timestamps.length >= 5) {
          if (!fuse.isTripped) {
            console.warn('[DEV FUSE] Auto-collapse oscillation detected - ignoring rapid toggles');
            fuse.isTripped = true;
          }
          return; // Skip this update
        }
        
        // Add current timestamp
        fuse.timestamps.push(now);
        
        // Reset fuse if we're below threshold
        if (fuse.timestamps.length < 5 && fuse.isTripped) {
          fuse.isTripped = false;
        }
      }

      if (briefManualOverride !== 'none') {
        return;
      }

      const comparatorActive = compareItemsCount >= 2;
      const nextCollapsed = flowStartedStrict && (isRightPanelOpen || comparatorActive);

      // Only update when it actually changes
      if (nextCollapsed !== lastCollapsedRef.current) {
        setBriefCollapsed(nextCollapsed);
        lastCollapsedRef.current = nextCollapsed;

        // Telemetry (normalized: brief area)
        const payload = { area: 'brief', collapsed: nextCollapsed, reason: 'auto' as const, uiPhase, compareCount: compareItemsCount };
        const last = lastBriefLayoutEventRef.current;
        if (!last || last.collapsed !== payload.collapsed || last.reason !== payload.reason) {
          const sig = `${payload.area}|${payload.collapsed}|${payload.reason}|ui:${uiPhase}|cmp:${compareItemsCount}`;
          if (!markAndShouldSkipAssistant(telemetry.events.UI_LAYOUT_CHANGED, sig)) {
            telemetry.track(telemetry.events.UI_LAYOUT_CHANGED, payload);
          }
          lastBriefLayoutEventRef.current = { collapsed: payload.collapsed, reason: payload.reason };
        }
      }
    }, 50); // 50ms debounce

    return () => clearTimeout(timeoutId);
  }, [
    isRightPanelOpen,
    compareItemsCount,
    setBriefCollapsed,
    briefManualOverride,
    uiPhase,
    flowStartedStrict,
    collapseMode,
  ]);

  // Direct plans search (CTA) → right panel, no chat
  useEffect(() => {
    const onSearch = async () => {
      const brief = useBriefStore.getState().brief as Brief | null;
      try {
        const { sessionId, userId } = await getUserContext();
        // Emit one-time injection telemetry for direct plan search submissions
        try {
          const constraints = {
            category: brief?.category || null,
            maxBudgetCop: typeof brief?.maxBudgetCop === 'number' && Number.isFinite(brief?.maxBudgetCop as number) ? brief?.maxBudgetCop : null,
            mustHaveCoverages: Array.isArray(brief?.mustHaveCoverages) ? brief?.mustHaveCoverages : [],
            notes: (brief?.notes || ''),
          } as const;
          const { fieldsFilled } = telemetry.metrics.countBriefFields(constraints as any);
          const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          telemetry.track(telemetry.events.BRIEF_INJECTED_INTO_TOOL, {
            tool: 'plan_search',
            fieldCount: fieldsFilled,
            sessionId,
            userId,
            runId,
          });
        } catch {}
        const sig = `${brief?.category || 'none'}|${typeof brief?.maxBudgetCop === 'number'}|${Array.isArray(brief?.mustHaveCoverages) ? brief!.mustHaveCoverages!.length : 0}`;
        if (!markAndShouldSkipAssistant(telemetry.events.PLANS_SEARCHED, sig)) {
          telemetry.track(telemetry.events.PLANS_SEARCHED, {
            category: brief?.category || null,
            hasBudget: typeof brief?.maxBudgetCop === 'number' && brief.maxBudgetCop! > 0,
            mustHaveCount: Array.isArray(brief?.mustHaveCoverages) ? brief!.mustHaveCoverages!.length : 0,
            source: 'cta',
            sessionId,
            userId,
          });
        }
      } catch {}
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const filters = brief ? buildPlanFiltersFromBrief(brief) : { category: 'auto', country: 'CO' as const, limit: 3 };
      const plans = await searchPlans(filters as any);
      if (Array.isArray(plans) && plans.length > 0) {
        showPanelWithPlans({ title: t('assistant.results_title'), plans, category: filters.category, dataSource: 'plans_v2', hasRealPlans: true });
        try {
          setBriefCollapsed(true);
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[LAYOUT] → window (results:', plans.length, ')');
          }
        } catch {}
      } else {
        // No results path: do not build templates. Show empty results payload with metadata.
        const derivedCategory = (filters as any)?.category || brief?.category || undefined;
        showPanelWithPlans({
          title: t('assistant.results_title'),
          plans: [],
          category: derivedCategory,
          hasRealPlans: false,
          dataSource: 'plans_v2',
          source: 'cta',
          requestId,
          filters: filters as any,
        });

        // Optionally append a single chat notice about no results, deduped by requestId
        try {
          if (isNoResultsChatNoticeEnabled && isNoResultsChatNoticeEnabled()) {
            const eventName = 'NO_RESULTS_CHAT_NOTICE';
            const sig = `rid:${requestId}`;
            if (!markAndShouldSkipAssistant(eventName, sig)) {
              appendAssistantMessage(String(t('chat.noResults.notice')));
            }
          }
        } catch {}
      }
      // uiPhase will be set by showPanelWithPlans when results exist
    };
    window.addEventListener('briki:search-plans', onSearch);
    return () => window.removeEventListener('briki:search-plans', onSearch);
  }, [setUiPhase, showPanelWithPlans]);

  // Helper function to check if user input is an affirmative command
  const isAffirmativeCommand = (text: string): boolean => {
    const affirmatives = [
      "sí",
      "si",
      "yes",
      "dale",
      "ok",
      "okay",
      "búscalos",
      "buscalos",
      "busca",
      "muéstrame",
      "muestrame",
      "adelante",
      "vamos",
      "claro",
      "por supuesto",
      "obvio",
      "ya",
      "ahora",
      "búscalos ya",
      "buscalos ya",
      "hazlo",
    ];
    const normalizedText = text.toLowerCase().trim();
    return affirmatives.some((word) => normalizedText.includes(word));
  };

  // Handle form submission with intent detection
  const handleSmartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Gate composer during analysis prep
    const { layoutMode } = useUI.getState();
    if (layoutMode === 'analysis_prep' || layoutMode === 'analysis_portal_prep') {
      const text = (input || '').trim();
      if (!text) return;

      // Persist note into analyzer store
      useAnalyzer.getState().setNote(text);

      // Telemetry for note added
      try {
        telemetry.track(telemetry.events.ANALYZER_NOTE_ADDED || 'analyzer_note_added', {
          length: text.length,
          wordCount: text.split(/\s+/).filter(Boolean).length,
        });
      } catch {}

      // Append a local user bubble (no network)
      appendAssistantMessage(JSON.stringify({ type: 'user_note', content: text }));

      // Clear composer input
      handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
      return; // Do not call handleSubmit (prevents /api/ai/chat)
    }

    if (input.trim()) {
      // Check if this is an affirmative response and we have onboarding data
      const hasOnboardingData =
        loadedOnboardingData && Object.keys(loadedOnboardingData).length > 0;
      const lastAssistantMessage = messages
        .filter((m) => m.role === "assistant")
        .pop();
      const isWaitingForConfirmation = lastAssistantMessage?.content?.includes(
        t("assistant.waiting_confirmation"),
      );

      if (
        hasOnboardingData &&
        isWaitingForConfirmation &&
        isAffirmativeCommand(input)
      ) {
        // Transform affirmative to a search query
        const insuranceKey = (loadedOnboardingData as any)?.insuranceType ?? "";
        // Get the localized category name from the onboarding options
        const insuranceCategory = t(`onboarding.options.${insuranceKey}.label`) || insuranceKey;

        // Vary the search query to avoid repetition
        const searchTemplates = [
          t("assistant.search_templates.search_plans").replace('{category}', insuranceCategory),
          t("assistant.search_templates.show_insurance").replace('{category}', insuranceCategory),
          t("assistant.search_templates.view_options").replace('{category}', insuranceCategory),
          t("assistant.search_templates.available_plans").replace('{category}', insuranceCategory),
        ];
        const searchQuery =
          searchTemplates[Math.floor(Math.random() * searchTemplates.length)];

        // Replace the input with the search query
        handleInputChange({
          target: { value: searchQuery },
        } as React.ChangeEvent<HTMLInputElement>);

        // Submit after a brief moment
        setTimeout(() => {
          injectBriefConstraintsIfApplied().finally(() => {
            handleSubmit(e);
          });
        }, 100);
      } else {
        // Normal submission
        await injectBriefConstraintsIfApplied();
        await handleSubmit(e);
      }
    }
  };

  // Remove the authentication check - let users use the chat
  // The PDFUpload component will handle its own auth check

  // Show loading state if data is still loading
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-black">
        <div className="h-full w-full flex flex-col items-center justify-center p-6">
          {/* Loading message */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-6xl font-bold mb-2">
                <span className="text-black dark:text-white">
                  {t("assistant.welcome_title").replace("Briki", "")}
                </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400">
                  Briki
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {t("assistant.loading_subtitle")}
              </p>
            </motion.div>
          </div>

          {/* Loading spinner */}
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const commandSuggestions = {
    compare: t("assistant.suggestions.compare") as string[],
    analyze: t("assistant.suggestions.analyze") as string[],
  };

  // keep reference; replaced above to coordinate overlay

  // Analysis completion now handled by in-card panel

  const handleCommandSelect = (command: string) => {
    handleInputChange({
      target: { value: command },
    } as React.ChangeEvent<HTMLInputElement>);
    setActiveCommandCategory(null);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // [AUDIT] Layout snapshot
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AUDIT] Layout snapshot:', {
      uiPhase,
      isDualPanelMode,
      isRightPanelOpen,
      hasResults: !!currentResults
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log("🎯 GEMINI-STYLE: Layout state:", {
      isDualPanelMode,
      isRightPanelOpen,
      currentResults,
    });
  }

  // State for extract brief chip
  const [showExtractChip, setShowExtractChip] = useState(false);
  const [pendingPastedText, setPendingPastedText] = useState("");
  const [ffIncredibleBrief, setFfIncredibleBrief] = useState<boolean>(false);
  const [ffLongPasteGuard, setFfLongPasteGuard] = useState<boolean>(true);
  const [isPendingTextLong, setIsPendingTextLong] = useState<boolean>(false);
  const [showReparseDialog, setShowReparseDialog] = useState(false);

  // Resolve feature flag once per mount (deterministic per user/session)
  useEffect(() => {
    (async () => {
      try {
        const { sessionId, userId } = await getUserContext();
        const enabled = getFFIncredibleBrief({ sessionId, userId });
        setFfIncredibleBrief(enabled);
        const longGuard = getFFLongPasteGuard({ sessionId, userId });
        setFfLongPasteGuard(longGuard);
      } catch {
        // default false on error
        setFfIncredibleBrief(false);
        setFfLongPasteGuard(true);
      }
    })();
  }, []);

  // Parse text and handle merge/replace
  const handleParseBrief = async (action: 'merge' | 'replace' = 'merge') => {
    const v2Enabled = ((): boolean => {
      try {
        const raw = String(process.env.NEXT_PUBLIC_BRIEF_PARSER_V2 || '').toLowerCase();
        return raw === '1' || raw === 'true' || raw === 'on';
      } catch { return false; }
    })();
    const exposureKey = 'ffexp:brief_parser_v2';

    const startTs = now();
    try {
      const { sessionId, userId } = await getUserContext();

      // One-time feature flag exposure per session
      try {
        if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
          if (!sessionStorage.getItem(exposureKey)) {
            telemetry.track('FEATURE_FLAG_EXPOSURE', {
              flag: 'brief_parser_v2',
              value: v2Enabled,
              sessionId,
              userId,
            });
            sessionStorage.setItem(exposureKey, '1');
          }
        }
      } catch {}

      // Emit STARTED and legacy REQUESTED events
      telemetry.track('BRIEF_PARSE_STARTED', {
        source: 'paste',
        chars: pendingPastedText.length,
        v2: v2Enabled,
        sessionId,
        userId,
        userAction: action,
      });
      telemetry.track(telemetry.events.BRIEF_PARSE_REQUESTED || 'BRIEF_PARSE_REQUESTED', {
        source: 'paste',
        chars: pendingPastedText.length,
        v2: v2Enabled,
        sessionId,
        userId,
        userAction: action,
      });
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.log('[AUDIT] brief_parse_started', {
            sessionId,
            userId,
            v2Enabled,
            action,
            chars: pendingPastedText.length
          });
        } catch {}
      }

      // Prepare text for parsing (summarize first if long)
      let textForParsing = pendingPastedText;
      if (isPendingTextLong && ffLongPasteGuard) {
        try {
          const sumRes = await fetch('/api/briefs/summarize-and-parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: pendingPastedText, locale: language })
          });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            if (sumData?.compactText && typeof sumData.compactText === 'string') {
              textForParsing = sumData.compactText as string;
            }
          } else {
            try { (await import('@/hooks/use-toast')).toast({ title: t('paste.summarizationFailed') as string, description: t('paste.tryingDirectExtraction') as string, variant: 'destructive' }); } catch {}
          }
        } catch {
          try { (await import('@/hooks/use-toast')).toast({ title: t('paste.summarizationFailed') as string, description: t('paste.tryingDirectExtraction') as string, variant: 'destructive' }); } catch {}
        }
      }

      // Call server parser (v2 when flag ON)
      const url = `/api/briefs/parse-from-text${v2Enabled ? '?v=2' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textForParsing, locale: language })
      });
      const data = await res.json();

      if (data && !data.error) {
        const parsed = data as Partial<Brief>;
        const fieldsFilled = Object.keys(parsed).filter(k => {
          const v = (parsed as any)[k];
          if (v === null || v === undefined) return false;
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === 'object') return Object.keys(v).length > 0;
          return true;
        });

        const latencyMs = Math.max(0, Math.round(since(startTs)));
        telemetry.track(telemetry.events.BRIEF_PARSE_COMPLETED, {
          source: 'paste',
          via_summary: isPendingTextLong === true,
          v2: v2Enabled,
          latencyMs,
          fieldsFilledCount: fieldsFilled.length,
          fieldsFilled,
          hasCategory: Boolean((parsed as any)?.category),
          hasBudget: typeof (parsed as any)?.maxBudgetCop === 'number' && (parsed as any)?.maxBudgetCop > 0,
          mustHavesCount: Array.isArray((parsed as any)?.mustHaveCoverages) ? (parsed as any)?.mustHaveCoverages.length : 0,
          sessionId,
          userId,
          userAction: action,
        });
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.log('[AUDIT] brief_parse_completed', {
              latencyMs,
              fieldsFilledCount: fieldsFilled.length,
              sessionId,
              userId
            });
          } catch {}
        }

        // Keep legacy success metric as well
        telemetry.track(telemetry.events.BRIEF_PARSED_SUCCESS, {
          source: 'text',
          fieldsFilled,
          userAction: action,
          sessionId,
          userId,
        });

        if (action === 'replace') {
          // Clear existing brief first
          useBriefStore.getState().clearBrief();
        }

        await mergeParsedBriefIntoStore({ ...parsed, rawText: pendingPastedText }, 'paste');

        // Start TTP marker (non-blocking)
        try { performance.mark('ttp.start'); } catch {}
      } else {
        telemetry.track(telemetry.events.BRIEF_PARSE_FAILED, {
          source: 'paste',
          via_summary: isPendingTextLong === true,
          v2: v2Enabled,
          status: res?.status,
          userAction: action,
          sessionId,
          userId,
        });
        telemetry.track(telemetry.events.PARSER_OUTPUT_SCHEMA_MISMATCH, { source: 'text', sessionId, userId });
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.log('[AUDIT] brief_parse_failed', {
              status: res?.status,
              sessionId,
              userId
            });
          } catch {}
        }
      }
    } catch (err) {
      console.error('[paste→parse] error:', err);
      try {
        const { sessionId, userId } = await getUserContext();
        telemetry.track(telemetry.events.BRIEF_PARSE_FAILED, { source: 'paste', via_summary: isPendingTextLong === true, userAction: action, sessionId, userId });
        telemetry.track(telemetry.events.PARSER_OUTPUT_SCHEMA_MISMATCH, { source: 'text', sessionId, userId });
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.log('[AUDIT] brief_parse_exception', {
              hasSessionId: !!sessionId,
              hasUserId: !!userId
            });
          } catch {}
        }
      } catch {}
    } finally {
      setShowExtractChip(false);
      setPendingPastedText("");
      setIsPendingTextLong(false);
      setShowReparseDialog(false);
    }
  };

  // Merge helper: apply parsed brief into store honoring dirty fields (client wins)
  const mergeParsedBriefIntoStore = async (
    parsed: Partial<Brief>,
    source: 'paste' | 'upload'
  ) => {
    try {
      const store = useBriefStore.getState();
      const current = store.brief;
      const dirty = store.dirtyFields || new Set<keyof Brief>();

      if (!parsed || (parsed as any).error) return;
      const { brief: normalizedParsed } = validateAndNormalizeBrief(parsed);

      if (!current) {
        const { sessionId, userId } = await getUserContext();
        const now = new Date().toISOString();
        const initial: Brief = {
          id: `brief-${Date.now()}`,
          userId: userId || 'anonymous',
          sessionId: sessionId || 'unknown',
          clientId: undefined,
          locale: language as any,
          source,
          category: normalizedParsed.category ?? null,
          maxBudgetCop: normalizedParsed.maxBudgetCop ?? null,
          mustHaveCoverages: normalizedParsed.mustHaveCoverages ?? [],
          exclusions: normalizedParsed.exclusions,
          clientPersona: normalizedParsed.clientPersona,
          notes: normalizedParsed.notes,
          rawText: normalizedParsed.rawText,
          docRefs: normalizedParsed.docRefs,
          createdAt: now,
          updatedAt: now,
          version: 1,
          isApplied: false,
        };
        store.setBrief(initial);
        return;
      }

      const patch: Partial<Brief> = {};

      if (normalizedParsed.category && !dirty.has('category')) patch.category = normalizedParsed.category as any;
      if (typeof normalizedParsed.maxBudgetCop === 'number' && normalizedParsed.maxBudgetCop > 0 && !dirty.has('maxBudgetCop')) patch.maxBudgetCop = normalizedParsed.maxBudgetCop;
      if (Array.isArray(normalizedParsed.mustHaveCoverages) && normalizedParsed.mustHaveCoverages.length > 0 && !dirty.has('mustHaveCoverages')) {
        const union = Array.from(new Set([...(current.mustHaveCoverages || []), ...normalizedParsed.mustHaveCoverages]));
        patch.mustHaveCoverages = union;
      }
      if (normalizedParsed.clientPersona && !dirty.has('clientPersona')) patch.clientPersona = normalizedParsed.clientPersona;
      if (normalizedParsed.notes && !dirty.has('notes')) patch.notes = normalizedParsed.notes;
      if (normalizedParsed.rawText) patch.rawText = normalizedParsed.rawText;
      patch.source = source;

      if (Array.isArray(normalizedParsed.docRefs) && normalizedParsed.docRefs.length > 0) {
        const existing = current.docRefs || [];
        const combined = [...existing, ...normalizedParsed.docRefs];
        const byRef = new Map<string, NonNullable<Brief['docRefs']>[number]>();
        for (const ref of combined) {
          if (ref && ref.ref) byRef.set(ref.ref, ref);
        }
        patch.docRefs = Array.from(byRef.values());
      }

      // Choose one field to mark dirty so autosave triggers
      const dirtyField: keyof Brief | undefined = (
        (patch.category ? 'category' : undefined) ||
        (patch.maxBudgetCop !== undefined ? 'maxBudgetCop' : undefined) ||
        (patch.mustHaveCoverages ? 'mustHaveCoverages' : undefined) ||
        (patch.clientPersona ? 'clientPersona' : undefined) ||
        (patch.notes ? 'notes' : undefined) ||
        ('rawText')
      ) as keyof Brief | undefined;

      const whitelistedPatch = pickBriefWhitelist(patch);
      store.updateBrief(whitelistedPatch, dirtyField ? { field: dirtyField } : undefined);
    } catch (e) {
      console.error('[mergeParsedBriefIntoStore] error:', e);
    }
  };

  return (
    <div
      className={
        isEmbedded
          ? "h-full w-full flex flex-col overflow-hidden"
          : "h-screen w-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-black"
      }
    >
      {/* Removed PlanResultsObserver to avoid injecting plans/templates into chat */}

      {/* PlanPinObserver - Listens for plan pin/unpin events */}
      <PlanPinObserver appendAssistantMessage={appendAssistantMessage} />

      {/* CategoryFallbackObserver - Listens for category not found events */}
      <CategoryFallbackObserver
        appendAssistantMessage={appendAssistantMessage}
      />

      {/* Layout Mode Toggle hidden per design cleanup */}
      {/* <LayoutModeToggle variant="floating" size="sm" /> */}

      {/* GEMINI-STYLE: True dual-panel layout with automatic compression */}
      <div
        className={
          isEmbedded ? "h-full w-full flex" : "h-full w-full flex"
        }
      >
        {/* LEFT PANEL: Chat Area */}
        <div
          className={`relative flex flex-col transition-all duration-300 ${(() => {
            const lm = useUI.getState().layoutMode;
            const isPortalMode = lm === 'analysis_portal_prep' || lm === 'analysis_running' || lm === 'analysis_results';
            // In overlay mode, chat should always take full width (no shrink)
            if (isPortalMode) return 'w-full';
            return 'w-full';
          })()}`}
        >
          {/* Main Content Area */}
          <div
            className={
              isEmbedded
                ? `flex-1 min-h-0 overflow-y-auto ${railPad} ${isDualPanelMode && isRightPanelOpen ? 'md:pr-[20rem]' : ''}`
                : `flex-1 overflow-y-auto ${isDualPanelMode && isRightPanelOpen ? 'md:pr-[20rem]' : ''}`
            }
            ref={scrollRegionRef}
          >
            {/* Show brief chip when collapsed (window mode only) */}
            {collapseMode === 'window' && isBriefCollapsed && flowStartedStrict && (
              <div className="absolute top-4 left-4 z-10">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-background/80 backdrop-blur-sm shadow-lg"
                  onClick={async () => {
                    if (!lastCollapsedRef.current) return;
                    setManualOverride('expanded');
                    setBriefCollapsed(false);
                    lastCollapsedRef.current = false;
                    telemetry.track(telemetry.events.UI_LAYOUT_CHANGED, {
                      area: 'brief',
                      collapsed: false,
                      reason: 'manual',
                      uiPhase,
                      compareCount: compareItemsCount,
                    });
                  }}
                  aria-label={t('assistant.show_brief')}
                >
                  {t('assistant.show_brief')}
                </Button>
              </div>
            )}
            
            {/* Status Banner - only when messages are empty and in working phase */}
            {messages.length === 0 && phaseText && (
              <div 
                className="sticky top-0 z-10 px-3 py-2 mb-2 mt-2 text-xs text-muted-foreground bg-muted/30 border rounded-md flex items-center gap-2"
                role="status"
                aria-live="polite"
                aria-label={phaseText}
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{phaseText}</span>
              </div>
            )}

            {/* Brief context banner - compact, above messages list */}
            {isBriefApplied && (
              <div className="px-3 py-2 mb-2 mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-md flex items-center justify-between" aria-live="polite">
                <span>
                  {(() => {
                    const base = t('assistant.brief_context_banner') as string;
                    const message = base.replace('{details}', briefBannerDetails ? ` (${briefBannerDetails})` : '');
                    return message;
                  })()}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { sessionId, userId } = await getUserContext();
                      const sig = `session:${sessionId}`;
                      if (!markAndShouldSkipAssistant(telemetry.events.BRIEF_CONTEXT_BANNER_EDIT_CLICKED, sig)) {
                        telemetry.track(telemetry.events.BRIEF_CONTEXT_BANNER_EDIT_CLICKED, { sessionId, userId });
                      }
                    } catch {}
                    try { window.dispatchEvent(new CustomEvent('briki:open-brief')); } catch {}
                  }}
                  className="ml-3 text-xs font-medium text-blue-700 dark:text-blue-300 underline hover:text-blue-900 dark:hover:text-blue-200"
                >
                  {t('brief.actions.edit') as any}
                </button>
              </div>
            )}

            {/* Results status banner - shows when templates/sources are present */}
            {uiPhase === 'results' && ((currentResults?.templates?.length || currentResults?.sources?.length)) && (
              <ResultsStatusBanner />
            )}

            {/* Comparator - only when explicitly opened and 2+ items */}
            {isComparatorOpen && compareItemsCount >= 2 && (
              <div
                id="comparison-panel"
                className={`${railWidth} ${railPad} mx-auto`}
                style={{ scrollMarginTop: 'calc(var(--app-nav-h, var(--nav-h, 64px)) + 8px)' }}
              >
                <Comparator brief={briefForComparison} locale={language as 'es' | 'en'} />
              </div>
            )}

            {/* Right Panel Empty Results - when no results found */}
            {messages.length === 0 && uiPhase === 'results' && brief && shortlist.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">{t("assistant.no_results_title")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("assistant.no_results_subtitle")}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try { window.dispatchEvent(new CustomEvent('briki:open-brief')); } catch {}
                    }}
                  >
                    {t("assistant.expand_budget")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try { window.dispatchEvent(new CustomEvent('briki:open-brief')); } catch {}
                    }}
                  >
                    {t("assistant.fewer_requirements")}
                  </Button>
                </div>
              </div>
            )}
            {showWelcome !== false && messages.length === 0 && uiPhase === 'welcome' && (() => {
              const lm = useUI.getState().layoutMode;
              const isPortalMode = lm === 'analysis_portal_prep' || lm === 'analysis_running' || lm === 'analysis_results';
              return !isPortalMode;
            })() ? (
              <WelcomeHero
                onStartBrief={() => {
                  // open the left brief or focus the brief section
                  // Emit an event or call a prop if you already pass one.
                  // Fallback: focus the left column via a custom event.
                  try { window.dispatchEvent(new CustomEvent('briki:open-brief')); } catch {}
                }}
                onAnalyzePdf={() => {
                  try { useAnalyzerUI.getState().open('quickAction'); } catch {}
                }}
              />
            ) : showWelcome !== false &&
              messages.length === 0 &&
              uiPhase === 'welcome' &&
              !isEmbedded &&
              (() => {
                const lm = useUI.getState().layoutMode;
                const isPortalMode = lm === 'analysis_portal_prep' || lm === 'analysis_running' || lm === 'analysis_results';
                return !isPortalMode;
              })() ? (
              <div className="flex flex-col items-center justify-center h-full px-6 pt-8">
                {/* Welcome message */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-8"
                >
                  <h1 className="text-6xl font-bold mb-4">
                    <span className="text-black dark:text-white">
                      {t("assistant.welcome_title").replace("Briki", "")}
                    </span>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400">
                      Briki
                    </span>
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md">
                    {t("assistant.welcome_subtitle")}
                  </p>
                  {loadedOnboardingData &&
                    Object.keys(loadedOnboardingData).length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>{t("assistant.contextLabel")}:</strong>{" "}
                          {createContextMessage(loadedOnboardingData as any)}
                        </p>
                      </div>
                    )}
                </motion.div>

                {/* Command suggestions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-full max-w-xl mx-auto"
                >
                  <div className="grid grid-cols-1 gap-3">
                    <CommandButton
                      icon={<Shield className="w-4 h-4" />}
                      label={t("assistant.search_insurance")}
                      isActive={activeCommandCategory === "compare"}
                      onClick={() => setActiveCommandCategory("compare")}
                    />
                    <CommandButton
                      icon={<FileText className="w-4 h-4" />}
                      label={t("assistant.analyze_policy")}
                      isActive={activeCommandCategory === "analyze"}
                      onClick={() => setActiveCommandCategory("analyze")}
                    />
                  </div>
                  <AnimatePresence>
                    {activeCommandCategory && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
                      >
                        <div className="space-y-2">
                          {commandSuggestions[
                            activeCommandCategory as keyof typeof commandSuggestions
                          ]?.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleCommandSelect(suggestion)}
                              className="w-full text-left p-2 text-base text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            ) : (
              <div
                className={
                  isEmbedded
                    ? `flex-1 min-h-0 overflow-y-auto ${railWidth} ${railPad} py-3 space-y-2 sm:space-y-1.5`
                    : `${
                        isDualPanelMode && isRightPanelOpen
                          ? "w-full px-3"
                          : "max-w-2xl mx-auto px-3"
                      } py-3 space-y-2 sm:space-y-1.5 transition-all duration-300`
                }
              >
                {messages
                  .filter((message) => message.role !== "system") // Hide system messages from UI
                  .map((message, index) => {
                    let isComparison = false;
                    try {
                      const parsed = JSON.parse(message.content);
                      isComparison = parsed?.type === "comparison";
                    } catch {}
                    return (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-full ${isEmbedded ? (isComparison ? "sm:max-w-[98%]" : "sm:max-w-[95%]") : isComparison ? "sm:max-w-[95%]" : "sm:max-w-[85%]"} rounded-lg px-4 py-3 text-xl leading-relaxed ${
                            message.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-neutral-700"
                          }`}
                        >
                          <MessageRenderer
                            content={message.content}
                            role={message.role}
                            name={(message as any).name}
                            toolInvocations={(message as any).toolInvocations}
                            onAnalyzePlan={onAnalyzePlan}
                            onToggleSelect={onToggleSelect}
                            isSelected={isSelected}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Composer Area */}
          <div
            className={
              isEmbedded
                ? `border-t bg-white dark:bg-black ${railWidth} ${railPad} pb-[env(safe-area-inset-bottom,12px)] ${
                    isDualPanelMode && isRightPanelOpen ? 'md:pr-[20rem]' : ''
                  }`
                : `sticky bottom-0 z-[60] border-t bg-white dark:bg-black ${
                    isDualPanelMode && isRightPanelOpen
                      ? "w-full px-4"
                      : "max-w-2xl mx-auto px-4"
                  } ${isDualPanelMode && isRightPanelOpen ? 'md:pr-[20rem]' : ''} transition-all duration-300 pb-[env(safe-area-inset-bottom,16px)]`
            }
          >
            {/* Quick actions rail above composer */}
            <QuickActionBar />
            
            <form
              onSubmit={handleSmartSubmit}
              className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden my-2"
            >
              <div className="p-3">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={t('assistant.multimodalPlaceholder') as any}
                  value={input}
                  onChange={handleInputChange}
                  data-testid="chat-input"
                  onPaste={async (e) => {
                    const text = e.clipboardData.getData('text');
                    // Always show the chip in E2E tests for reliability
                    const isE2E = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');
                    if ((ffIncredibleBrief || isE2E) && text.length >= 200 && !showExtractChip) {
                      e.preventDefault();
                      setPendingPastedText(text);
                      setShowExtractChip(true);
                      // Long paste guard detection (client-side)
                      try {
                        const charLimit = (() => {
                          const raw = String(process.env.NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT || '').trim();
                          const n = Number.parseInt(raw, 10);
                          return Number.isFinite(n) && n > 0 ? n : 12000; // ~4k tokens
                        })();
                        const tokenLimit = (() => {
                          const raw = String(process.env.NEXT_PUBLIC_LONG_PASTE_TOKEN_LIMIT || '').trim();
                          const n = Number.parseInt(raw, 10);
                          return Number.isFinite(n) && n > 0 ? n : 4000;
                        })();
                        const approxTokens = Math.ceil(text.length / 4);
                        const isLong = ffLongPasteGuard && (text.length > charLimit || approxTokens > tokenLimit);
                        setIsPendingTextLong(isLong);
                        if (process.env.NODE_ENV !== 'production') {
                          try {
                            console.log('[AUDIT] paste_chip_shown', {
                              chars: text.length,
                              approxTokens,
                              charLimit,
                              tokenLimit,
                              isLong,
                              ffIncredibleBrief,
                              ffLongPasteGuard,
                              isE2E
                            });
                          } catch {}
                        }
                        if (isLong) {
                          // Non-blocking toast to explain summarize-first flow
                          try {
                            const { toast } = await import('@/hooks/use-toast');
                            toast({
                              title: t('brief.longPasteGuard.title') as any,
                              description: t('brief.longPasteGuard.description') as any,
                            });
                          } catch {}
                          // Telemetry
                          try {
                            const { sessionId, userId } = await getUserContext();
                            telemetry.track(telemetry.events.PASTE_LONG_GUARDED || 'PASTE_LONG_GUARDED', {
                              chars: text.length,
                              approxTokens,
                              limitChars: charLimit,
                              limitTokens: tokenLimit,
                              sessionId,
                              userId,
                            });
                          } catch {}
                        } else {
                          setIsPendingTextLong(false);
                        }
                      } catch {}
                      
                      // Show chip only; do not emit parse requested yet
                    }
                  }}
                />
                {/* Hint while in analysis prep mode */}
                {(useUI.getState().layoutMode === 'analysis_prep' || useUI.getState().layoutMode === 'analysis_portal_prep') && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('assistant.analysis_prep.note_hint')}
                  </p>
                )}
              </div>
              {/* Extract brief chip */}
              {showExtractChip && (
                <div className="mx-auto max-w-2xl px-3 mb-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 flex items-center justify-between gap-2" aria-live="polite">
                    <span className="text-sm text-blue-800 dark:text-blue-200 flex-1">
                      {t('brief.extractChip') as any}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid="extract-brief-chip-confirm"
                        aria-label={t('brief.apply_to_assistant')}
                        onClick={async () => {
                          // Check if we have existing brief data
                          const currentBrief = useBriefStore.getState().brief;
                          const hasExistingData = Boolean(
                            currentBrief?.category ||
                            currentBrief?.maxBudgetCop ||
                            (currentBrief?.mustHaveCoverages?.length ?? 0) > 0 ||
                            currentBrief?.clientPersona ||
                            currentBrief?.notes
                          );

                          if (hasExistingData) {
                            if (process.env.NODE_ENV !== 'production') {
                              try { console.log('[AUDIT] paste_chip_confirm_clicked', { hasExistingData: true }); } catch {}
                            }
                            setShowReparseDialog(true);
                            return;
                          }

                          if (process.env.NODE_ENV !== 'production') {
                            try { console.log('[AUDIT] paste_chip_confirm_clicked', { hasExistingData: false }); } catch {}
                          }
                          await handleParseBrief('merge');
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {t('brief.extractChip') as any}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('briki:open-brief'));
                          setShowExtractChip(false);
                          setPendingPastedText("");
                          if (process.env.NODE_ENV !== 'production') {
                            try { console.log('[AUDIT] paste_chip_edit_clicked'); } catch {}
                          }
                        }}
                        data-testid="extract-brief-chip-edit"
                        className="px-3 py-1 text-xs border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-800/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {t('brief.actions.edit') as any}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowExtractChip(false);
                          setPendingPastedText("");
                          if (process.env.NODE_ENV !== 'production') {
                            try { console.log('[AUDIT] paste_chip_dismiss_clicked'); } catch {}
                          }
                        }}
                        data-testid="extract-brief-chip-dismiss"
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-full"
                        aria-label={t('brief.actions.discard') as any}
                      >
                        <XIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="px-4 py-2 border-t border-gray-100 dark:border-neutral-700 flex items-center justify-between">
                {/* Analyzer CTA moved to QuickActionBar for single entrypoint */}
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          clearChat();
                          clearResults();
                          setDualPanelMode(false);
                          setSidebarOpen(false);
                          // Reset assistant telemetry dedupe guards on chat restart lifecycle
                          ASSISTANT_TELEMETRY_TOKEN += 1;
                          ASSISTANT_TELEMETRY_KEYS.clear();
                          const override = useUILayoutStore.getState().briefManualOverride;
                          if (override !== 'manual-closed') {
                            setBriefCollapsed(false);
                            lastCollapsedRef.current = false;
                          }
                          setUiPhase('welcome');
                          if (process.env.NODE_ENV !== 'production') {
                            console.debug('[LAYOUT] → welcome (restart chat)');
                          }
                        } catch {}
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full transition-colors hover:border-gray-300 dark:hover:border-gray-600"
                    >
                      {t("assistant.restart_chat")}
                    </button>
                  )}
                  {/* Microphone removed for a cleaner, intentional UI */}
                  <button
                    type="submit"
                    disabled={!input.trim() || chatLoading}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                      input.trim() && !chatLoading
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {chatLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
          {/* Embedded results sidebar */}
          {isDualPanelMode && isRightPanelOpen && (
            <PlanResultsSidebar
              variant="embedded"
              isOpen={true}
              onClose={hideRightPanel}
              onClosed={() => {
                try {
                  setDualPanelMode(false);
                  setSidebarOpen(false);
                  const override = useUILayoutStore.getState().briefManualOverride;
                  if (override !== 'manual-closed') {
                    setBriefCollapsed(false);
                    lastCollapsedRef.current = false;
                  }
                  if (compareItemsCount === 0 && !policyAnalysis) {
                    setUiPhase('welcome');
                    if (process.env.NODE_ENV !== 'production') {
                      console.debug('[LAYOUT] → welcome');
                    }
                  }
                } catch {}

                (async () => {
                  try {
                    const { sessionId, userId } = await getUserContext();
                    telemetry.track(telemetry.events.UI_LAYOUT_CHANGED, {
                      leftCollapsed: useUILayoutStore.getState().isBriefCollapsed,
                      rightOpen: false,
                      dualMode: false,
                      reason: 'results_closed',
                      sessionId, userId
                    });
                  } catch {}
                })();
              }}
              currentResults={currentResults}
              className="hidden md:flex"
            />
          )}
        </div>

        {/* PDF Upload modal removed - analyzer now uses in-card panel */}

        <AnimatePresence>
          {policyAnalysis && !isAnalysisDocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
              onClick={() => {
                setPolicyAnalysis(null);
                overlay.closeAnalyzeModal();
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-[1460px] w-[96.5vw] h-[92vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="h-full overflow-y-auto"
                  style={{ scrollbarGutter: "stable" as any }}
                >
                  <div
                    className="p-6"
                    aria-labelledby="analysis-dialog-title"
                    aria-describedby="analysis-dialog-desc"
                  >
                    <div id="analysis-dialog-title" className="sr-only">
                      {t("assistant.analyze_policy")}
                    </div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {t("assistant.analyze_policy")}
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setIsAnalysisDocked(true);
                            overlay.closeAnalyzeModal();
                          }}
                          className="px-2 py-1 text-xs border rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
                        >
                          {t('common.minimize')}
                        </button>
                        <button
                          onClick={() => {
                            setPolicyAnalysis(null);
                            overlay.closeAnalyzeModal();
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <PolicyAnalysisDisplay
                      analysis={policyAnalysis}
                      pdfUrl={policyAnalysis._pdfData?.pdfUrl}
                      fileName={policyAnalysis._pdfData?.fileName}
                      rawAnalysisData={policyAnalysis._pdfData?.rawAnalysisData}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {policyAnalysis && isAnalysisDocked && (
          <div className="fixed bottom-4 right-4 z-[95]">
            <div className="flex items-center gap-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
              <span className="text-sm text-gray-700 dark:text-gray-200">
                {t("assistant.analyze_policy")}
              </span>
              <button
                onClick={() => {
                  setIsAnalysisDocked(false);
                  overlay.openAnalyzeModal();
                }}
                className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700"
              >
                {t('common.reopen')}
              </button>
              <button
                onClick={() => {
                  setIsAnalysisDocked(false);
                  setPolicyAnalysis(null);
                  overlay.closeAnalyzeModal();
                }}
                className="text-xs px-2 py-1 rounded-full border hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-300"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}

      {/* Floating handle to restore results when minimized (hidden while modal open) */}
      <ResultsToggle />

      {/* Re-parse confirmation dialog */}
      <ReparseConfirmDialog
        isOpen={showReparseDialog}
        onClose={() => {
          setShowReparseDialog(false);
          setShowExtractChip(false);
          setPendingPastedText("");
        }}
        onConfirm={(action) => handleParseBrief(action)}
      />

        {/* RIGHT PANEL removed: now embedded in chat container */}
      </div>
    </div>
  );
}

interface CommandButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function CommandButton({ icon, label, isActive, onClick }: CommandButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 p-3 rounded-lg border transition-all ${
        isActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
      }`}
    >
      {icon}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </button>
  );
}
