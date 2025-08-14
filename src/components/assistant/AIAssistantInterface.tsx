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
import { ArrowUp, FileText, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { useBrikiChat } from "@/hooks/useBrikiChat";
import { MessageRenderer } from "./MessageRenderer";
import { PDFUpload } from "./PDFUpload";
import { PolicyAnalysisDisplay } from "./PolicyAnalysisDisplay";
import { PolicyHistory } from "./PolicyHistory";
import { X, Sidebar, MessageSquare, Layout } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PlanResultsProvider, usePlanResults } from "@/contexts/PlanResultsContext";
import { PlanResultsSidebar } from "./PlanResultsSidebar";
import { LayoutModeToggle } from "./LayoutModeToggle";
import { PlanResultsObserver } from "./PlanResultsObserver";
import { PlanPinObserver } from "./PlanPinObserver";
import { CategoryFallbackObserver } from "./CategoryFallbackObserver";
import { ComparisonObserver } from "./ComparisonObserver";

interface AIAssistantInterfaceProps {
  isLoading?: boolean;
  onboardingData?: Partial<{
    insuranceType: string;
    coverageFor: string;
    budget: string;
    city: string;
  }>;
}

export function AIAssistantInterface({ isLoading = false, onboardingData = {} }: AIAssistantInterfaceProps) {
  return (
    <PlanResultsProvider defaultDualPanelMode={true}>
      <AIAssistantInterfaceInner isLoading={isLoading} onboardingData={onboardingData} />
    </PlanResultsProvider>
  );
}

function AIAssistantInterfaceInner({ isLoading = false, onboardingData = {} }: AIAssistantInterfaceProps) {
  const { t, language } = useTranslation();
  const searchParams = useSearchParams();
  const { 
    currentResults, 
    isRightPanelOpen, 
    hideRightPanel, 
    isDualPanelMode, 
    setDualPanelMode 
  } = usePlanResults();

  // Helper function to create context message from onboarding data
  const createContextMessage = (data: any, userLanguage: string) => {
    const parts = [];
    const isEnglish = userLanguage === 'en';
    
    // Map the values based on language
    const insuranceTypeMap: Record<string, string> = isEnglish ? {
      'health': 'health',
      'life': 'life',
      'auto': 'auto',
      'home': 'home',
      'travel': 'travel',
      'business': 'business',
      'unsure': 'undefined'
    } : {
      'health': 'salud',
      'life': 'vida',
      'auto': 'auto',
      'home': 'hogar',
      'travel': 'viaje',
      'business': 'empresarial',
      'unsure': 'no definido'
    };
    
    const coverageMap: Record<string, string> = isEnglish ? {
      'me': 'individual',
      'couple': 'couple',
      'family': 'family',
      'business': 'business'
    } : {
      'me': 'individual',
      'couple': 'pareja',
      'family': 'familiar',
      'business': 'empresarial'
    };
    
    const budgetMap: Record<string, string> = isEnglish ? {
      'under_50k': 'under $50,000 COP (~$12 USD/month)',
      '50k_to_100k': '$50,000 to $100,000 COP (~$12-25 USD/month)',
      'over_100k': 'over $100,000 COP (~$25+ USD/month)',
      'unsure': 'undefined'
    } : {
      'under_50k': 'menos de $50.000 COP',
      '50k_to_100k': '$50.000 a $100.000 COP',
      'over_100k': 'más de $100.000 COP',
      'unsure': 'no definido'
    };
    
    if (data.insuranceType) {
      const label = isEnglish ? 'Insurance type' : 'Tipo de seguro';
      const insuranceLabel = insuranceTypeMap[data.insuranceType] || data.insuranceType;
      parts.push(`${label}: ${insuranceLabel}`);
    }
    if (data.coverageFor) {
      const label = isEnglish ? 'Coverage' : 'Cobertura';
      const coverageLabel = coverageMap[data.coverageFor] || data.coverageFor;
      parts.push(`${label}: ${coverageLabel}`);
    }
    if (data.budget) {
      const label = isEnglish ? 'Monthly budget' : 'Presupuesto mensual';
      const budgetLabel = budgetMap[data.budget] || data.budget;
      parts.push(`${label}: ${budgetLabel}`);
    }
    if (data.city) {
      const label = isEnglish ? 'City' : 'Ciudad';
      parts.push(`${label}: ${data.city}`);
    }
    
    if (parts.length > 0) {
      const contextPrefix = isEnglish ? 'User context' : 'Contexto del usuario';
      const contextSuffix = isEnglish ? 
        'Use this information to provide more accurate and relevant recommendations.' :
        'Usa esta información para proporcionar recomendaciones más precisas y relevantes.';
      return `${contextPrefix}: ${parts.join(', ')}. ${contextSuffix}`;
    }
    
    return '';
  };

  // Disable onboarding data loading - start with clean state
  const [loadedOnboardingData, setLoadedOnboardingData] = useState(() => {
    // Always return empty object to start with clean state
    console.log('🎯 Starting with clean state - no onboarding data');
    return {};
  });

  // Create initial messages - always start with empty array for clean state
  const [initialMessages] = useState(() => {
    // Always return empty array - no pre-loaded messages or context
    console.log('🎯 Starting with clean chat - no initial messages');
    return [];
  });

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

  // Detect comparison messages to allow wider chat area when sidebar is open
  // Declare this BEFORE any early returns to preserve hook order
  const hasComparisonMessage = useMemo(() => {
    return messages.some((m) => {
      if (m.role !== 'assistant') return false;
      try {
        const parsed = JSON.parse(m.content as string);
        return parsed?.type === 'comparison';
      } catch {
        return false;
      }
    });
  }, [messages]);

  

  const { data: session } = useSession();
  const [userId, setUserId] = useState<string>(''); // Initialize as empty string
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showUploadAnimation, setShowUploadAnimation] = useState(false);
  const [activeCommandCategory, setActiveCommandCategory] = useState<
    string | null
  >(null);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [policyAnalysis, setPolicyAnalysis] = useState<any>(null);
  const [showPolicyHistory, setShowPolicyHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Set userId from session when available
  useEffect(() => {
    if (session?.user) {
      const sessionUser = session.user as any;
      if (sessionUser.id) {
        setUserId(sessionUser.id);
        console.log('🔐 User ID set from session:', sessionUser.id);
      } else if (sessionUser.email) {
        // Fallback to email if no ID
        setUserId(sessionUser.email);
        console.log('📧 Using email as user ID:', sessionUser.email);
      }
    } else {
      // For chat functionality without auth, use a session-based ID
      const sessionId = `guest-${Date.now()}`;
      setUserId(sessionId);
      console.log('👤 Using guest session ID:', sessionId);
    }
  }, [session]);

  // Clear in-memory analysis if session user changes (sign-out or switch account)
  useEffect(() => {
    // When user signs out or switches, drop any existing analysis to prevent reuse of stale upload_id
    setPolicyAnalysis(null);
  }, [(session?.user as any)?.id]);

  // Inject onboarding context when component mounts and has data
  useEffect(() => {
    if (onboardingData && Object.keys(onboardingData).length > 0 && messages.length === 0) {
      console.log('🎯 Injecting onboarding context:', onboardingData);
      
      // Create a context message based on onboarding data
      const contextMessage = createContextMessage(onboardingData);
      
      // Note: We can't directly append to the chat, but the context will be used
      // when the user starts chatting. The AI will have access to this context.
      console.log('📝 Context message created:', contextMessage);
    }
  }, [onboardingData, messages.length]);

  // Check for openUpload parameter and open modal
  useEffect(() => {
    if (searchParams) {
      const shouldOpenUpload = searchParams.get('openUpload') === 'true';
      if (shouldOpenUpload) {
        setShowPDFUpload(true);
      }
    }
  }, [searchParams]);

  // Handle reanalyze request from SavePolicyButton guardrail modal
  useEffect(() => {
    const handler = () => {
      setPolicyAnalysis(null);
      setShowPDFUpload(true);
    };
    window.addEventListener('reanalyze-under-current-account', handler as EventListener);
    return () => window.removeEventListener('reanalyze-under-current-account', handler as EventListener);
  }, []);

  // Helper function to check if user input is an affirmative command
  const isAffirmativeCommand = (text: string): boolean => {
    const affirmatives = [
      'sí', 'si', 'yes', 'dale', 'ok', 'okay', 
      'búscalos', 'buscalos', 'busca', 'muéstrame', 'muestrame',
      'adelante', 'vamos', 'claro', 'por supuesto', 'obvio',
      'ya', 'ahora', 'búscalos ya', 'buscalos ya', 'hazlo'
    ];
    const normalizedText = text.toLowerCase().trim();
    return affirmatives.some(word => normalizedText.includes(word));
  };

  // Handle form submission with intent detection
  const handleSmartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (input.trim()) {
      // Check if this is an affirmative response and we have onboarding data
      const hasOnboardingData = loadedOnboardingData && Object.keys(loadedOnboardingData).length > 0;
      const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
      const isWaitingForConfirmation = lastAssistantMessage?.content?.includes('¿Busco planes ahora?');
      
      if (hasOnboardingData && isWaitingForConfirmation && isAffirmativeCommand(input)) {
        // Transform affirmative to a search query
        const insuranceTypeMap: Record<string, string> = {
          'health': 'salud',
          'life': 'vida',
          'auto': 'auto',
          'home': 'hogar',
          'travel': 'viaje',
          'business': 'empresarial'
        };
        
        const insuranceCategory = insuranceTypeMap[loadedOnboardingData.insuranceType] || loadedOnboardingData.insuranceType;
        
        // Vary the search query to avoid repetition
        const searchTemplates = [
          `Buscar planes de ${insuranceCategory}`,
          `Mostrar seguros de ${insuranceCategory}`,
          `Ver opciones de ${insuranceCategory}`,
          `Planes de ${insuranceCategory} disponibles`
        ];
        const searchQuery = searchTemplates[Math.floor(Math.random() * searchTemplates.length)];
        
        // Replace the input with the search query
        handleInputChange({ target: { value: searchQuery } } as React.ChangeEvent<HTMLInputElement>);
        
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
          {/* Logo with animated gradient */}
          <div className="mb-8 w-20 h-20 relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 200 200"
              width="100%"
              height="100%"
              className="w-full h-full"
            >
              <g clipPath="url(#cs_clip_1_ellipse-12)">
                <mask
                  id="cs_mask_1_ellipse-12"
                  style={{ maskType: "alpha" }}
                  width="200"
                  height="200"
                  x="0"
                  y="0"
                  maskUnits="userSpaceOnUse"
                >
                  <path
                    fill="#fff"
                    fillRule="evenodd"
                    d="M100 150c27.614 0 50-22.386 50-50s-22.386-50-50-50-50 22.386-50 50 22.386 50 50 50zm0 50c55.228 0 100-44.772 100-100S155.228 0 100 0 0 44.772 0 100s44.772 100 100 100z"
                    clipRule="evenodd"
                  ></path>
                </mask>
                <g mask="url(#cs_mask_1_ellipse-12)">
                  <path fill="#fff" d="M200 0H0v200h200V0z"></path>
                  <path
                    fill="#0066FF"
                    fillOpacity="0.33"
                    d="M200 0H0v200h200V0z"
                  ></path>
                  <g
                    filter="url(#filter0_f_844_2811)"
                    className="animate-gradient"
                  >
                    <path fill="#0066FF" d="M110 32H18v68h92V32z"></path>
                    <path fill="#0044FF" d="M188-24H15v98h173v-98z"></path>
                    <path fill="#0099FF" d="M175 70H5v156h170V70z"></path>
                    <path fill="#00CCFF" d="M230 51H100v103h130V51z"></path>
                  </g>
                </g>
              </g>
              <defs>
                <filter
                  id="filter0_f_844_2811"
                  width="385"
                  height="410"
                  x="-75"
                  y="-104"
                  colorInterpolationFilters="sRGB"
                  filterUnits="userSpaceOnUse"
                >
                  <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                  <feBlend
                    in="SourceGraphic"
                    in2="BackgroundImageFix"
                    result="shape"
                  ></feBlend>
                  <feGaussianBlur
                    result="effect1_foregroundBlur_844_2811"
                    stdDeviation="40"
                  ></feGaussianBlur>
                </filter>
                <clipPath id="cs_clip_1_ellipse-12">
                  <path fill="#fff" d="M0 0H200V200H0z"></path>
                </clipPath>
              </defs>
              <g
                style={{ mixBlendMode: "overlay" }}
                mask="url(#cs_mask_1_ellipse-12)"
              >
                <path
                  fill="gray"
                  stroke="transparent"
                  d="M200 0H0v200h200V0z"
                  filter="url(#cs_noise_1_ellipse-12)"
                ></path>
              </g>
              <defs>
                <filter
                  id="cs_noise_1_ellipse-12"
                  width="100%"
                  height="100%"
                  x="0%"
                  y="0%"
                  filterUnits="objectBoundingBox"
                >
                  <feTurbulence
                    baseFrequency="0.6"
                    numOctaves="5"
                    result="out1"
                    seed="4"
                  ></feTurbulence>
                  <feComposite
                    in="out1"
                    in2="SourceGraphic"
                    operator="in"
                    result="out2"
                  ></feComposite>
                  <feBlend
                    in="SourceGraphic"
                    in2="out2"
                    mode="overlay"
                    result="out3"
                  ></feBlend>
                </filter>
              </defs>
            </svg>
          </div>

          {/* Loading message */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400 mb-2">
                {t("assistant.loading_title")}
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

  const handleUploadFile = () => {
    setShowPDFUpload(true);
  };

  const handleAnalysisComplete = (analysis: any) => {
    setPolicyAnalysis(analysis);
    setShowPDFUpload(false);
  };

  const handleAnalysisError = (error: string) => {
    console.error('PDF analysis error:', error);
    setShowPDFUpload(false);
  };

  const handleCommandSelect = (command: string) => {
    handleInputChange({ target: { value: command } } as React.ChangeEvent<HTMLInputElement>);
    setActiveCommandCategory(null);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };



  console.log('🎯 GEMINI-STYLE: Layout state:', { isDualPanelMode, isRightPanelOpen, currentResults });

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-black">
      {/* PlanResultsObserver - Listens for structured data events */}
      <PlanResultsObserver appendAssistantMessage={appendAssistantMessage} />
      
      {/* PlanPinObserver - Listens for plan pin/unpin events */}
      <PlanPinObserver appendAssistantMessage={appendAssistantMessage} />
      
      {/* CategoryFallbackObserver - Listens for category not found events */}
      <CategoryFallbackObserver appendAssistantMessage={appendAssistantMessage} />
      
      {/* ComparisonObserver - Listens for comparison requests */}
      <ComparisonObserver appendAssistantMessage={appendAssistantMessage} />
      
      {/* Layout Mode Toggle hidden per design cleanup */}
      {/* <LayoutModeToggle variant="floating" size="sm" /> */}
      
      {/* GEMINI-STYLE: True dual-panel layout with automatic compression */}
      <div className="h-full w-full flex pt-16">
        {/* LEFT PANEL: Chat Area */}
        <div className={`flex flex-col transition-all duration-300 ${
          isDualPanelMode && isRightPanelOpen 
            ? 'w-[calc(100%-28rem)] lg:w-[calc(100%-32rem)]' // Compressed when panel open
            : 'w-full' // Full width when panel closed
        }`}>
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 pt-8">
              {/* Logo with animated gradient */}
              <div className="mb-8 w-20 h-20 relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 200 200"
                  width="100%"
                  height="100%"
                  className="w-full h-full"
                >
                  <g clipPath="url(#cs_clip_1_ellipse-12)">
                    <mask
                      id="cs_mask_1_ellipse-12"
                      style={{ maskType: "alpha" }}
                      width="200"
                      height="200"
                      x="0"
                      y="0"
                      maskUnits="userSpaceOnUse"
                    >
                      <path
                        fill="#fff"
                        fillRule="evenodd"
                        d="M100 150c27.614 0 50-22.386 50-50s-22.386-50-50-50-50 22.386-50 50 22.386 50 50 50zm0 50c55.228 0 100-44.772 100-100S155.228 0 100 0 0 44.772 0 100s44.772 100 100 100z"
                        clipRule="evenodd"
                      ></path>
                    </mask>
                    <g mask="url(#cs_mask_1_ellipse-12)">
                      <path fill="#fff" d="M200 0H0v200h200V0z"></path>
                      <path
                        fill="#0066FF"
                        fillOpacity="0.33"
                        d="M200 0H0v200h200V0z"
                      ></path>
                      <g
                        filter="url(#filter0_f_844_2811)"
                        className="animate-gradient"
                      >
                        <path fill="#0066FF" d="M110 32H18v68h92V32z"></path>
                        <path fill="#0044FF" d="M188-24H15v98h173v-98z"></path>
                        <path fill="#0099FF" d="M175 70H5v156h170V70z"></path>
                        <path fill="#00CCFF" d="M230 51H100v103h130V51z"></path>
                      </g>
                    </g>
                  </g>
                  <defs>
                    <filter
                      id="filter0_f_844_2811"
                      width="385"
                      height="410"
                      x="-75"
                      y="-104"
                      colorInterpolationFilters="sRGB"
                      filterUnits="userSpaceOnUse"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                      <feBlend
                        in="SourceGraphic"
                        in2="BackgroundImageFix"
                        result="shape"
                      ></feBlend>
                      <feGaussianBlur
                        result="effect1_foregroundBlur_844_2811"
                        stdDeviation="40"
                      ></feGaussianBlur>
                    </filter>
                    <clipPath id="cs_clip_1_ellipse-12">
                      <path fill="#fff" d="M0 0H200V200H0z"></path>
                    </clipPath>
                  </defs>
                  <g
                    style={{ mixBlendMode: "overlay" }}
                    mask="url(#cs_mask_1_ellipse-12)"
                  >
                    <path
                      fill="gray"
                      stroke="transparent"
                      d="M200 0H0v200h200V0z"
                      filter="url(#cs_noise_1_ellipse-12)"
                    ></path>
                  </g>
                  <defs>
                    <filter
                      id="cs_noise_1_ellipse-12"
                      width="100%"
                      height="100%"
                      x="0%"
                      y="0%"
                      filterUnits="objectBoundingBox"
                    >
                      <feTurbulence
                        baseFrequency="0.6"
                        numOctaves="5"
                        result="out1"
                        seed="4"
                      ></feTurbulence>
                      <feComposite
                        in="out1"
                        in2="SourceGraphic"
                        operator="in"
                        result="out2"
                      ></feComposite>
                      <feBlend
                        in="SourceGraphic"
                        in2="out2"
                        mode="overlay"
                        result="out3"
                      ></feBlend>
                    </filter>
                  </defs>
                </svg>
              </div>

              {/* Welcome message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400 mb-4">
                  {t("assistant.welcome_title")}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md">
                  {t("assistant.welcome_subtitle")}
                </p>
                {loadedOnboardingData && Object.keys(loadedOnboardingData).length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>{t("assistant.context")}:</strong> {createContextMessage(loadedOnboardingData)}
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
                    isActive={activeCommandCategory === 'compare'}
                    onClick={() => setActiveCommandCategory('compare')}
                  />
                  <CommandButton
                    icon={<FileText className="w-4 h-4" />}
                    label={t("assistant.analyze_policy")}
                    isActive={activeCommandCategory === 'analyze'}
                    onClick={() => setActiveCommandCategory('analyze')}
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
                        {commandSuggestions[activeCommandCategory as keyof typeof commandSuggestions]?.map((suggestion, index) => (
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
            <div className={`${
              isDualPanelMode && isRightPanelOpen ? (hasComparisonMessage ? 'max-w-4xl' : 'max-w-lg') : 'max-w-2xl'
            } mx-auto px-3 py-3 space-y-2 sm:space-y-1.5 transition-all duration-300`}>
              {messages
                .filter(message => message.role !== 'system') // Hide system messages from UI
                .map((message, index) => {
                  let isComparison = false;
                  try {
                    const parsed = JSON.parse(message.content);
                    isComparison = parsed?.type === 'comparison';
                  } catch {}
                  return (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-full ${isComparison ? 'sm:max-w-[95%]' : 'sm:max-w-[85%]'} rounded-lg px-4 py-3 text-xl leading-relaxed ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-neutral-700'
                        }`}
                      >
                        <MessageRenderer
                          content={message.content}
                          role={message.role}
                          name={(message as any).name}
                          toolInvocations={(message as any).toolInvocations}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Sticky Input Area */}
        <div className="sticky bottom-0 z-10 border-t bg-white dark:bg-black">
          <div className={`${
            isDualPanelMode && isRightPanelOpen ? (hasComparisonMessage ? 'max-w-4xl' : 'max-w-lg') : 'max-w-2xl'
          } mx-auto px-3 transition-all duration-300`}>
            <form onSubmit={handleSmartSubmit} className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden my-2">
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
                <button
                  type="button"
                  onClick={handleUploadFile}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>{t("assistant.analyze_policy")}</span>
                </button>
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

        {/* Modals */}
        <AnimatePresence>
          {showPDFUpload && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowPDFUpload(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {t("assistant.analyze_policy")}
                    </h2>
                    <button
                      onClick={() => setShowPDFUpload(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <PDFUpload
                      onAnalysisComplete={handleAnalysisComplete}
                      onError={handleAnalysisError}
                      userId={userId}
                    />
                    
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <PolicyHistory 
                        userId={userId} 
                        onViewAnalysis={setPolicyAnalysis}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {policyAnalysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setPolicyAnalysis(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-[1400px] w-[95vw] h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6" aria-labelledby="analysis-dialog-title" aria-describedby="analysis-dialog-desc">
                  <div id="analysis-dialog-title" className="sr-only">Analyze Policy PDF</div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {t("assistant.analyze_policy")}
                    </h2>
                    <button
                      onClick={() => setPolicyAnalysis(null)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <PolicyAnalysisDisplay 
                    analysis={policyAnalysis} 
                    pdfUrl={policyAnalysis._pdfData?.pdfUrl}
                    fileName={policyAnalysis._pdfData?.fileName}
                    rawAnalysisData={policyAnalysis._pdfData?.rawAnalysisData}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

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
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
      }`}
    >
      {icon}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </button>
  );
} 