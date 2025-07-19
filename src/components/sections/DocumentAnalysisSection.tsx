"use client";

import { motion } from "framer-motion";
import { Upload, Brain, CheckCircle, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";

export const DocumentAnalysisSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      number: 1,
      title: t("landing.document_analysis.steps.upload.title"),
      description: t("landing.document_analysis.steps.upload.description")
    },
    {
      number: 2,
      title: t("landing.document_analysis.steps.analysis.title"),
      description: t("landing.document_analysis.steps.analysis.description")
    },
    {
      number: 3,
      title: t("landing.document_analysis.steps.recommendations.title"),
      description: t("landing.document_analysis.steps.recommendations.description")
    }
  ];

  return (
    <section id="document-analysis" className="py-20 lg:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12 lg:mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-gray-800 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4 lg:mb-6 shadow-sm border border-blue-200 dark:border-blue-800">
            <Brain className="w-4 h-4" />
            {t("landing.document_analysis.badge")}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 dark:text-white mb-4 lg:mb-6">
            <span>{t("landing.document_analysis.title").split(',')[0]},</span>{' '}
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              {t("landing.document_analysis.title").split(',')[1]}
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t("landing.document_analysis.description")}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6 lg:space-y-8"
          >
            <div className="space-y-4 lg:space-y-6">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="pt-4 lg:pt-6"
            >
              <Link href="/assistant?openUpload=true" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-500 transition-all duration-200 shadow-md hover:shadow-lg">
                {t("landing.document_analysis.cta")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Column - Upload UI Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Preview Label */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800 px-4 py-1.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-400 border border-blue-200 dark:border-gray-700 shadow-sm">
              {t("landing.document_analysis.preview_label")}
            </div>

            <div className="relative bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-2xl backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-md">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{t("landing.document_analysis.upload_label")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing.document_analysis.upload_description")}</p>
                </div>
              </div>

              {/* Upload Area - Now clearly non-interactive */}
              <div className="border-2 border-dashed border-blue-200 dark:border-gray-600 rounded-xl p-8 text-center mb-6 opacity-60 select-none cursor-not-allowed bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-gray-800/50 dark:to-gray-800/50">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("landing.document_analysis.drop_files")}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t("landing.document_analysis.browse_files")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {t("landing.document_analysis.file_requirements")}
                </p>
              </div>

              {/* Processing Status - Static Demo */}
              <div className="space-y-4 opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500/70 to-cyan-400/70 rounded-full flex items-center justify-center shadow-sm">
                    <div className="w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">{t("landing.document_analysis.processing.title")}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing.document_analysis.processing.subtitle")}</p>
                  </div>
                </div>

                {/* Progress Items */}
                <div className="space-y-3 ml-9">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("landing.document_analysis.processing.steps.scan")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("landing.document_analysis.processing.steps.extract")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("landing.document_analysis.processing.steps.identify")}</span>
                  </div>
                </div>
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