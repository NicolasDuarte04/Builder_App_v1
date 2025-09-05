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

import { useState, useRef, useEffect, useMemo } from "react";
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
import {
  PlanResultsProvider,
  usePlanResults,
} from "@/contexts/PlanResultsContext";
import { PlanResultsSidebar } from "./PlanResultsSidebar";
import { LayoutModeToggle } from "./LayoutModeToggle";
import { PlanResultsObserver } from "./PlanResultsObserver";
import { PlanPinObserver } from "./PlanPinObserver";
import { CategoryFallbackObserver } from "./CategoryFallbackObserver";
import { ComparisonObserver } from "./ComparisonObserver";
import { useUIOverlay } from "@/state/uiOverlay";
import { ResultsToggle } from "./ResultsToggle";
import { useProposal, useUiPhase } from "@/state/proposal";
import { QuickActionBar } from "./QuickActionBar";

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

export function AIAssistantInterface({
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
  return (
    <PlanResultsProvider defaultDualPanelMode={true}>
      <AIAssistantInterfaceInner
        isLoading={isLoading}
        onboardingData={onboardingData}
        mode={mode}
        showWelcome={showWelcome}
        initialSeed={initialSeed}
        onAnalyzePlan={onAnalyzePlan}
        onToggleSelect={onToggleSelect}
        isSelected={isSelected}
        onAppendMessage={onAppendMessage}
      />
    </PlanResultsProvider>
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
  } = usePlanResults();

  // Helper function to create context message from onboarding data
  const createContextMessage = (data: any, userLanguage: string) => {
    const parts = [];
    const isEnglish = userLanguage === "en";

    // Map the values based on language
    const insuranceTypeMap: Record<string, string> = isEnglish
      ? {
          health: "health",
          life: "life",
          auto: "auto",
          home: "home",
          travel: "travel",
          business: "business",
          unsure: "undefined",
        }
      : {
          health: "salud",
          life: "vida",
          auto: "auto",
          home: "hogar",
          travel: "viaje",
          business: "empresarial",
          unsure: "no definido",
        };

    const coverageMap: Record<string, string> = isEnglish
      ? {
          me: "individual",
          couple: "couple",
          family: "family",
          business: "business",
        }
      : {
          me: "individual",
          couple: "pareja",
          family: "familiar",
          business: "empresarial",
        };

    const budgetMap: Record<string, string> = isEnglish
      ? {
          under_50k: "under $50,000 COP (~$12 USD/month)",
          "50k_to_100k": "$50,000 to $100,000 COP (~$12-25 USD/month)",
          over_100k: "over $100,000 COP (~$25+ USD/month)",
          unsure: "undefined",
        }
      : {
          under_50k: "menos de $50.000 COP",
          "50k_to_100k": "$50.000 a $100.000 COP",
          over_100k: "más de $100.000 COP",
          unsure: "no definido",
        };

    if (data.insuranceType) {
      const label = isEnglish ? "Insurance type" : "Tipo de seguro";
      const insuranceLabel =
        insuranceTypeMap[data.insuranceType] || data.insuranceType;
      parts.push(`${label}: ${insuranceLabel}`);
    }
    if (data.coverageFor) {
      const label = isEnglish ? "Coverage" : "Cobertura";
      const coverageLabel = coverageMap[data.coverageFor] || data.coverageFor;
      parts.push(`${label}: ${coverageLabel}`);
    }
    if (data.budget) {
      const label = isEnglish ? "Monthly budget" : "Presupuesto mensual";
      const budgetLabel = budgetMap[data.budget] || data.budget;
      parts.push(`${label}: ${budgetLabel}`);
    }
    if (data.city) {
      const label = isEnglish ? "City" : "Ciudad";
      parts.push(`${label}: ${data.city}`);
    }

    if (parts.length > 0) {
      const contextPrefix = isEnglish ? "User context" : "Contexto del usuario";
      const contextSuffix = isEnglish
        ? "Use this information to provide more accurate and relevant recommendations."
        : "Usa esta información para proporcionar recomendaciones más precisas y relevantes.";
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

  // Get proposal state for quick actions
  const { selected, setUiPhase, brief, shortlist } = useProposal();
  const uiPhase = useUiPhase();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: chatLoading,
    error: chatError,
    clearChat,
    appendAssistantMessage,
  } = useBrikiChat(initialMessages);

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
        console.log("🔐 User ID set from session:", sessionUser.id);
      } else if (sessionUser.email) {
        // Fallback to email if no ID
        setUserId(sessionUser.email);
        console.log("📧 Using email as user ID:", sessionUser.email);
      }
    } else {
      // For chat functionality without auth, use a session-based ID
      const sessionId = `guest-${Date.now()}`;
      setUserId(sessionId);
      console.log("👤 Using guest session ID:", sessionId);
    }
  }, [session]);

  // Clear in-memory analysis if session user changes (sign-out or switch account)
  useEffect(() => {
    // When user signs out or switches, drop any existing analysis to prevent reuse of stale upload_id
    setPolicyAnalysis(null);
  }, [(session?.user as any)?.id]);

  // Inject onboarding context when component mounts and has data
  useEffect(() => {
    if (
      onboardingData &&
      Object.keys(onboardingData).length > 0 &&
      messages.length === 0
    ) {
      console.log("🎯 Injecting onboarding context:", onboardingData);

      // Create a context message based on onboarding data
      const contextMessage = createContextMessage(onboardingData, language);

      // Note: We can't directly append to the chat, but the context will be used
      // when the user starts chatting. The AI will have access to this context.
      console.log("📝 Context message created:", contextMessage);
    }
  }, [onboardingData, messages.length]);

  // Analyzer now handled by in-card panel - no URL parameters or events needed

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

    if (input.trim()) {
      // Check if this is an affirmative response and we have onboarding data
      const hasOnboardingData =
        loadedOnboardingData && Object.keys(loadedOnboardingData).length > 0;
      const lastAssistantMessage = messages
        .filter((m) => m.role === "assistant")
        .pop();
      const isWaitingForConfirmation = lastAssistantMessage?.content?.includes(
        "¿Busco planes ahora?",
      );

      if (
        hasOnboardingData &&
        isWaitingForConfirmation &&
        isAffirmativeCommand(input)
      ) {
        // Transform affirmative to a search query
        const insuranceTypeMap: Record<string, string> = {
          health: "salud",
          life: "vida",
          auto: "auto",
          home: "hogar",
          travel: "viaje",
          business: "empresarial",
        };

        const insuranceKey = (loadedOnboardingData as any)?.insuranceType ?? "";
        const insuranceCategory =
          insuranceTypeMap[insuranceKey] || insuranceKey;

        // Vary the search query to avoid repetition
        const searchTemplates = [
          `Buscar planes de ${insuranceCategory}`,
          `Mostrar seguros de ${insuranceCategory}`,
          `Ver opciones de ${insuranceCategory}`,
          `Planes de ${insuranceCategory} disponibles`,
        ];
        const searchQuery =
          searchTemplates[Math.floor(Math.random() * searchTemplates.length)];

        // Replace the input with the search query
        handleInputChange({
          target: { value: searchQuery },
        } as React.ChangeEvent<HTMLInputElement>);

        // Submit after a brief moment
        setTimeout(() => {
          handleSubmit(e);
        }, 100);
      } else {
        // Normal submission
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

  console.log("🎯 GEMINI-STYLE: Layout state:", {
    isDualPanelMode,
    isRightPanelOpen,
    currentResults,
  });

  return (
    <div
      className={
        isEmbedded
          ? "h-full w-full flex flex-col overflow-hidden"
          : "h-screen w-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-black"
      }
    >
      {/* PlanResultsObserver - Listens for structured data events */}
      <PlanResultsObserver appendAssistantMessage={appendAssistantMessage} />

      {/* PlanPinObserver - Listens for plan pin/unpin events */}
      <PlanPinObserver appendAssistantMessage={appendAssistantMessage} />

      {/* CategoryFallbackObserver - Listens for category not found events */}
      <CategoryFallbackObserver
        appendAssistantMessage={appendAssistantMessage}
      />

      {/* ComparisonObserver - Listens for comparison requests */}
      <ComparisonObserver appendAssistantMessage={appendAssistantMessage} />

      {/* Layout Mode Toggle hidden per design cleanup */}
      {/* <LayoutModeToggle variant="floating" size="sm" /> */}

      {/* GEMINI-STYLE: True dual-panel layout with automatic compression */}
      <div
        className={
          isEmbedded ? "h-full w-full flex" : "h-full w-full flex pt-16"
        }
      >
        {/* LEFT PANEL: Chat Area */}
        <div
          className={`flex flex-col transition-all duration-300 ${
            isDualPanelMode && isRightPanelOpen
              ? "w-[calc(100%-28rem)] lg:w-[calc(100%-32rem)]" // Compressed when panel open
              : "w-full" // Full width when panel closed
          }`}
        >
          {/* Main Content Area */}
          <div
            className={
              isEmbedded
                ? `flex-1 min-h-0 overflow-y-auto ${railPad}`
                : "flex-1 overflow-y-auto"
            }
            ref={scrollRegionRef}
          >
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
            {showWelcome !== false && messages.length === 0 && uiPhase === 'welcome' ? (
              <WelcomeHero
                onStartBrief={() => {
                  // open the left brief or focus the brief section
                  // Emit an event or call a prop if you already pass one.
                  // Fallback: focus the left column via a custom event.
                  try { window.dispatchEvent(new CustomEvent('briki:open-brief')); } catch {}
                }}
                onAnalyzePdf={() => {
                  // Analyzer now handled by in-card panel - dispatch event to open it
                  window.dispatchEvent(new CustomEvent('briki:open-analyzer-panel'));
                }}
              />
            ) : showWelcome !== false &&
              messages.length === 0 &&
              uiPhase === 'welcome' &&
              !isEmbedded ? (
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
                          <strong>{t("assistant.context")}:</strong>{" "}
                          {createContextMessage(
                            loadedOnboardingData as any,
                            language,
                          )}
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
                          ? hasComparisonMessage
                            ? "max-w-4xl"
                            : "max-w-lg"
                          : "max-w-2xl"
                      } mx-auto px-3 py-3 space-y-2 sm:space-y-1.5 transition-all duration-300`
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
                ? `border-t bg-white dark:bg-black ${railWidth} ${railPad} pb-[env(safe-area-inset-bottom,12px)]`
                : `sticky bottom-0 z-10 border-t bg-white dark:bg-black ${
                    isDualPanelMode && isRightPanelOpen
                      ? hasComparisonMessage
                        ? "max-w-4xl"
                        : "max-w-lg"
                      : "max-w-2xl"
                  } mx-auto px-3 transition-all duration-300 pb-[env(safe-area-inset-bottom,12px)]`
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
                  placeholder={t("assistant.inputPlaceholder")}
                  value={input}
                  onChange={handleInputChange}
                  className="w-full text-gray-700 dark:text-gray-200 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent"
                />
              </div>
              <div className="px-4 py-2 border-t border-gray-100 dark:border-neutral-700 flex items-center justify-between">
                {!isEmbedded && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('briki:open-analyzer-panel'))}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{t("assistant.analyze_policy")}</span>
                  </button>
                )}
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={clearChat}
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
                      Analyze Policy PDF
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
                          Minimize
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
                Reopen
              </button>
              <button
                onClick={() => {
                  setIsAnalysisDocked(false);
                  setPolicyAnalysis(null);
                  overlay.closeAnalyzeModal();
                }}
                className="text-xs px-2 py-1 rounded-full border hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Floating handle to restore results when minimized (hidden while modal open) */}
        <ResultsToggle />

        {/* RIGHT PANEL: Insurance Results (Gemini-style) */}
        {isDualPanelMode && isRightPanelOpen && (
          <div className="w-96 lg:w-[32rem] h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <PlanResultsSidebar
              isOpen={true}
              onClose={hideRightPanel}
              currentResults={currentResults}
              className="relative h-full w-full border-l-0 shadow-none"
            />
          </div>
        )}
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
