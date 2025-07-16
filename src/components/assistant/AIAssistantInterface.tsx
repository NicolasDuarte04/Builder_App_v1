"use client";

import type React from "react";

import { useState, useRef } from "react";
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

interface AIAssistantInterfaceProps {
  isLoading?: boolean;
}

export function AIAssistantInterface({ isLoading = false }: AIAssistantInterfaceProps) {
  const { t } = useTranslation();
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
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 mb-2">
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
        {/* Header with logo and welcome message - only show when no messages */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 px-6">
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
            <div className="mb-10 text-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 mb-2">
                  {t("assistant.title")}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  {t("assistant.subtitle")}
                </p>
              </motion.div>
            </div>

            {/* Insurance action buttons */}
            <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-4">
              <CommandButton
                icon={<Shield className="w-5 h-5" />}
                label={t("assistant.compare_policies")}
                isActive={activeCommandCategory === "compare"}
                onClick={() =>
                  setActiveCommandCategory(
                    activeCommandCategory === "compare" ? null : "compare"
                  )
                }
              />
              <CommandButton
                icon={<FileText className="w-5 h-5" />}
                label={t("assistant.analyze_coverage")}
                isActive={activeCommandCategory === "analyze"}
                onClick={() =>
                  setActiveCommandCategory(
                    activeCommandCategory === "analyze" ? null : "analyze"
                  )
                }
              />
            </div>

            {/* Command suggestions */}
            <AnimatePresence>
              {activeCommandCategory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full max-w-md mb-6 overflow-hidden"
                >
                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-gray-100 dark:border-neutral-700">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {activeCommandCategory === "compare"
                          ? t("assistant.compare_suggestions")
                          : t("assistant.analyze_suggestions")}
                      </h3>
                    </div>
                    <ul className="divide-y divide-gray-100 dark:divide-neutral-700">
                      {commandSuggestions[
                        activeCommandCategory as keyof typeof commandSuggestions
                      ].map((suggestion, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleCommandSelect(suggestion)}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors duration-75"
                        >
                          <div className="flex items-center gap-3">
                            {activeCommandCategory === "compare" ? (
                              <Shield className="w-4 h-4 text-blue-600" />
                            ) : (
                              <FileText className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {suggestion}
                            </span>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Chat messages display - full height when messages exist */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`${
                      message.role === 'user'
                        ? 'max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-600 text-white'
                        : 'max-w-2xl'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="text-sm">{message.content}</p>
                    ) : (
                      <div className="bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg">
                        <MessageRenderer 
                          content={message.content} 
                          toolInvocations={(message as any).toolInvocations}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error display */}
        {chatError && (
          <div className="px-6 py-3">
            <div className="max-w-4xl mx-auto p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{chatError.message}</p>
            </div>
          </div>
        )}

        {/* Sticky input area at bottom */}
        <div className="sticky bottom-0 p-4 border-t bg-white dark:bg-neutral-900">
          <div className="max-w-4xl mx-auto">
            {/* Input area with integrated functions and file upload */}
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

              {/* Uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-50 dark:bg-neutral-800 py-1 px-2 rounded-md border border-gray-200 dark:border-neutral-600"
                      >
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span className="text-xs text-gray-700 dark:text-gray-300">{file}</span>
                        <button
                          onClick={() =>
                            setUploadedFiles((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Send and voice input actions */}
              <div className="px-4 py-3 flex items-center justify-end">
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

              {/* Upload files */}
              <div className="px-4 py-2 border-t border-gray-100 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={handleUploadFile}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  {showUploadAnimation ? (
                    <motion.div
                      className="flex space-x-1"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: {},
                        visible: {
                          transition: {
                            staggerChildren: 0.1,
                          },
                        },
                      }}
                    >
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                          variants={{
                            hidden: { opacity: 0, y: 5 },
                            visible: {
                              opacity: 1,
                              y: 0,
                              transition: {
                                duration: 0.4,
                                repeat: Infinity,
                                repeatType: "mirror",
                                delay: i * 0.1,
                              },
                            },
                          }}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>{t("assistant.analyze_policy")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* PDF Upload Modal */}
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

        {/* Policy Analysis Display */}
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
    <motion.button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
        isActive
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-sm"
          : "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600"
      }`}
    >
      <div className={`${isActive ? "text-blue-600" : "text-gray-500 dark:text-gray-400"}`}>
        {icon}
      </div>
      <span
        className={`text-sm font-medium ${
          isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
} 