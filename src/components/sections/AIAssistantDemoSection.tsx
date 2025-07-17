"use client";

import { motion } from "framer-motion";
import { Brain, Zap, FileText, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export const AIAssistantDemoSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Brain className="w-6 h-6"/>,
      title: "Instant Expert Answers",
      description: "Get clear, immediate responses to any insurance question, explained in simple terms."
    },
    {
      icon: <Zap className="w-6 h-6"/>,
      title: "Personalized Recommendations", 
      description: "Receive tailored insurance plans that match your specific needs and budget."
    },
    {
      icon: <FileText className="w-6 h-6"/>,
      title: "Easy Policy Navigation",
      description: "Understand complex terms and coverage options with visual comparisons and plain language."
    }
  ];

  return (
    <section id="assistant-demo" className="py-24 h-full dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">       <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Meet Your AI Insurance Assistant
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">       Get instant answers, personalized recommendations, and expert guidance for all your insurance needs.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Features */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-8"
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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
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
              className="pt-4"
            >
              <button className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-teal-600 transition-all duration-200">               Try the Assistant
                <ArrowRight className="w-4 h-4" />
              </button>
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
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              {/* Chat Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Briki Assistant</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Always here to help</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="space-y-4 mb-6">               {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-blue-600 to-teal-500 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                    <p className="text-sm">I need health insurance for my family of 4</p>
                  </div>
                </div>

                {/* Assistant Message */}
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-xs">
                    <p className="text-sm">I'd be happy to help you find the perfect family health plan! To give you the best recommendations, could you tell me your approximate budget?</p>
                  </div>
                </div>

                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-blue-600 to-teal-500 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                    <p className="text-sm">Around $400-500</p>
                  </div>
                </div>

                {/* Assistant Message with Plan */}
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-xs">
                    <p className="text-sm mb-3">eat! Based on your budget, I found 3 excellent family plans. Here are my top recommendations:</p>
                    
                    {/* Plan Card */}
                    <div className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">FlexHealth Basic</h4>
                        <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Best Value
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">Suramericana</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">Comprehensive coverage for families with predictable healthcare needs</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          $250
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          /month
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2">
                  <input 
                    type="text" 
                    placeholder="Ask about insurance plans..." 
                    className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled"
                  />
                </div>
                <button className="w-10 h-10 bg-gradient-to-r from-blue-600 to-teal-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0V5" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}; 