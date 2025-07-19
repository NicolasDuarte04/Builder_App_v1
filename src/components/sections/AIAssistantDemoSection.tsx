"use client";

import { motion } from "framer-motion";
import { Brain, Zap, FileText, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";

export const AIAssistantDemoSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Brain className="w-6 h-6 text-white"/>,
      title: t("landing.ai_assistant.features.instant_answers.title"),
      description: t("landing.ai_assistant.features.instant_answers.description")
    },
    {
      icon: <Zap className="w-6 h-6 text-white"/>,
      title: t("landing.ai_assistant.features.personalized_recommendations.title"),
      description: t("landing.ai_assistant.features.personalized_recommendations.description")
    },
    {
      icon: <FileText className="w-6 h-6 text-white"/>,
      title: t("landing.ai_assistant.features.easy_navigation.title"),
      description: t("landing.ai_assistant.features.easy_navigation.description")
    }
  ];

  return (
    <section id="assistant-demo" className="py-20 lg:py-24 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">       
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12 lg:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 dark:text-white mb-4 lg:mb-6">
            <span>{t("landing.ai_assistant.title").split(' ').slice(0, 2).join(' ')}</span>{' '}
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              {t("landing.ai_assistant.title").split(' ').slice(2).join(' ')}
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t("landing.ai_assistant.description")}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column - Features */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6 lg:space-y-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                viewport={{ once: true }}
                className="flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              className="pt-4 lg:pt-6"
            >
              <Link href="/assistant" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-500 transition-all duration-200 shadow-md hover:shadow-lg">
                {t("landing.ai_assistant.cta")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Column - Chat UI Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Preview Label */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800 px-4 py-1.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-400 border border-blue-200 dark:border-gray-700 shadow-sm">
              {t("landing.ai_assistant.preview_label")}
            </div>

            {/* Mockup Container with enhanced visual treatment */}
            <div className="relative bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-2xl backdrop-blur-xl">
              {/* Chat Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">Briki Assistant</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Always here to help</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="space-y-4 mb-6">                               
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-xs shadow-sm">
                    <p className="text-sm">I need health insurance for my family of 4</p>
                  </div>
                </div>

                {/* Assistant Message */}
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2.5 rounded-2xl rounded-bl-md max-w-xs">
                    <p className="text-sm">I'd be happy to help you find the perfect family health plan! To give you the best recommendations, could you tell me your approximate budget?</p>
                  </div>
                </div>

                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-xs shadow-sm">
                    <p className="text-sm">Around $400-500</p>
                  </div>
                </div>

                {/* Assistant Message with Plan */}
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2.5 rounded-2xl rounded-bl-md max-w-xs">
                    <p className="text-sm mb-3">Great! Based on your budget, I found 3 excellent family plans. Here are my top recommendations:</p>
                    
                    {/* Plan Card */}
                    <div className="bg-white dark:bg-gray-600 rounded-xl p-3 border border-gray-200 dark:border-gray-500 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm text-gray-800 dark:text-white">FlexHealth Basic</h4>
                        <div className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 text-gray-800 dark:text-blue-200 px-2 py-0.5 rounded-md text-xs font-medium">
                          Best Value
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Suramericana</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">Comprehensive coverage for families with predictable healthcare needs</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                          $250
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          /month
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Area - Now clearly non-interactive */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2.5 opacity-60">
                  <input 
                    type="text" 
                    placeholder="Ask about insurance plans..." 
                    className="w-full bg-transparent text-sm text-gray-400 dark:text-gray-500 placeholder-gray-400 dark:placeholder-gray-500 cursor-not-allowed select-none"
                    disabled
                    readOnly
                    aria-label="Demo input field - not interactive"
                  />
                </div>
                <button 
                  className="w-10 h-10 bg-gradient-to-r from-blue-500/60 to-cyan-400/60 rounded-full flex items-center justify-center cursor-not-allowed opacity-60"
                  disabled
                  aria-label="Demo send button - not interactive"
                >
                  <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0V5" />
                  </svg>
                </button>
              </div>

              {/* Mockup Overlay Hint */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/5 dark:to-black/5 pointer-events-none rounded-2xl"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}; 