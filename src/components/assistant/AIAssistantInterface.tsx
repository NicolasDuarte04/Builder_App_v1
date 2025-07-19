"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import {
  Mic,
  ArrowUp,
  FileText,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BackgroundLines } from "@/components/ui/background-lines";
import { useTranslation } from "@/hooks/useTranslation";
import { useBrikiChat } from "@/hooks/useBrikiChat";
import { MessageRenderer } from "./MessageRenderer";
import { PDFUpload } from "./PDFUpload";
import { PolicyAnalysisDisplay } from "./PolicyAnalysisDisplay";
import { PolicyHistory } from "./PolicyHistory";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";

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
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: chatLoading,
    error: chatError,
    clearChat,
  } = useBrikiChat();

  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showUploadAnimation, setShowUploadAnimation] = useState(false);
  const [activeCommandCategory, setActiveCommandCategory] = useState<
    string | null
  >(null);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [policyAnalysis, setPolicyAnalysis] = useState<any>(null);
  const [showPolicyHistory, setShowPolicyHistory] = useState(false);
  const [userId, setUserId] = useState<string>('test-user'); // TODO: Get from auth
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to create context message from onboarding data
  const createContextMessage = (data: any) => {
    const parts = [];
    
    if (data.insuranceType) {
      parts.push(`Tipo de seguro: ${data.insuranceType}`);
    }
    if (data.coverageFor) {
      parts.push(`Cobertura para: ${data.coverageFor}`);
    }
    if (data.budget) {
      parts.push(`Presupuesto: ${data.budget}`);
    }
    if (data.city) {
      parts.push(`Ciudad: ${data.city}`);
    }
    
    if (parts.length > 0) {
      return `Contexto del usuario: ${parts.join(', ')}. Usa esta información para proporcionar recomendaciones más precisas.`;
    }
    
    return '';
  };

  // Show loading state if data is still loading
  if (isLoading) {
    return (
      <BackgroundLines className="h-screen w-screen">
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
      </BackgroundLines>
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleSubmit(e);
    }
  };

  return (
    <BackgroundLines className="h-screen w-screen">
      <div className="h-full w-full flex flex-col pt-16">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6">
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
                  ¡Hola! Soy Briki
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md">
                  Tu asistente de seguros personalizado. ¿En qué puedo ayudarte hoy?
                </p>
                {onboardingData && Object.keys(onboardingData).length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Contexto:</strong> {createContextMessage(onboardingData)}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Command suggestions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full max-w-md"
              >
                <div className="grid grid-cols-1 gap-3">
                  <CommandButton
                    icon={<Shield className="w-4 h-4" />}
                    label="Buscar seguros"
                    isActive={activeCommandCategory === 'compare'}
                    onClick={() => setActiveCommandCategory('compare')}
                  />
                  <CommandButton
                    icon={<FileText className="w-4 h-4" />}
                    label="Analizar póliza"
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
                            className="w-full text-left p-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
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
            <div className="px-4 py-4 space-y-4">
              {messages.map((message, index) => {
                // Check if this message contains insurance plans
                const hasInsurancePlans = message.role === 'assistant' && 
                  ((message as any).toolInvocations?.some((tool: any) => 
                    tool.toolName === 'get_insurance_plans' && tool.result?.plans?.length > 0
                  ) || message.content.includes('"type":"insurance_plans"'));
                
                return (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`${
                        hasInsurancePlans ? 'w-full' : 'max-w-[80%]'
                      } rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : hasInsurancePlans 
                            ? 'bg-transparent p-0' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
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
        <div className="p-4 border-t bg-white/80 dark:bg-black/50 backdrop-blur-md">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={t("assistant.input_placeholder")}
                  value={input}
                  onChange={handleInputChange}
                  className="w-full text-gray-700 dark:text-gray-200 text-base outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent"
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
                  <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <Mic className="w-5 h-5" />
                  </button>
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
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Analizar Póliza de Seguro
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
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Análisis de Póliza
                    </h2>
                    <button
                      onClick={() => setPolicyAnalysis(null)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <PolicyAnalysisDisplay analysis={policyAnalysis} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BackgroundLines>
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