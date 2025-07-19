"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import dynamic from "next/dynamic";
import { Footer } from "@/components/blocks/footer-section";

// Dynamically import WorldMap to improve initial page load
const WorldMap = dynamic(
  () => import("@/components/ui/world-map").then(mod => ({ default: mod.WorldMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[2/1] bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse" />
    ),
  }
);

export default function AboutPage() {
  const { t } = useTranslation();

  // Latin American insurance coverage connections
  const insuranceConnections = [
    // Mexico City to major LATAM cities
    { start: { lat: 19.4326, lng: -99.1332 }, end: { lat: 4.7110, lng: -74.0721 } }, // Mexico City to Bogotá
    { start: { lat: 19.4326, lng: -99.1332 }, end: { lat: -12.0464, lng: -77.0428 } }, // Mexico City to Lima
    { start: { lat: 19.4326, lng: -99.1332 }, end: { lat: -34.6037, lng: -58.3816 } }, // Mexico City to Buenos Aires
    
    // São Paulo connections
    { start: { lat: -23.5505, lng: -46.6333 }, end: { lat: -33.4489, lng: -70.6693 } }, // São Paulo to Santiago
    { start: { lat: -23.5505, lng: -46.6333 }, end: { lat: 4.7110, lng: -74.0721 } }, // São Paulo to Bogotá
    { start: { lat: -23.5505, lng: -46.6333 }, end: { lat: -34.6037, lng: -58.3816 } }, // São Paulo to Buenos Aires
    
    // Additional connections for network effect
    { start: { lat: 4.7110, lng: -74.0721 }, end: { lat: -12.0464, lng: -77.0428 } }, // Bogotá to Lima
    { start: { lat: -12.0464, lng: -77.0428 }, end: { lat: -33.4489, lng: -70.6693 } }, // Lima to Santiago
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      {/* Hero Section - Simplified */}
      <section className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-neutral-800 dark:text-white sm:text-6xl">
              {t("about.hero.title")}
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t("about.hero.subtitle")}
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/login">
                <button className="inline-flex items-center justify-center rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500 px-6 py-3 shadow-sm transition-colors">
                  {t("about.hero.cta")}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-neutral-800 dark:text-white mb-8">
              {t("about.story.title")}
            </h2>
            <div className="space-y-6 text-lg text-gray-600 dark:text-gray-300 text-left">
              <p>
                {t("about.story.paragraph1")}
              </p>
              <p>
                {t("about.story.paragraph2")}
              </p>
              <p>
                {t("about.story.paragraph3")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section - Side by Side */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white dark:bg-black">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Mission */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-2xl"></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-10 shadow-sm border border-gray-100 dark:border-gray-800 h-full">
                <h3 className="text-3xl font-bold text-neutral-800 dark:text-white mb-6">
                  {t("about.mission.title")}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t("about.mission.description")}
                </p>
              </div>
            </div>

            {/* Vision */}
            <div className="relative">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-100 dark:bg-cyan-900/20 rounded-full blur-2xl"></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-10 shadow-sm border border-gray-100 dark:border-gray-800 h-full">
                <h3 className="text-3xl font-bold text-neutral-800 dark:text-white mb-6">
                  {t("about.vision.title")}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t("about.vision.description")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage Map Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950 flex-grow">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-800 dark:text-white mb-4">
              {t("about.coverage.title")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t("about.coverage.description")}
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto mb-16">
            <WorldMap 
              dots={insuranceConnections}
              lineColor="#06b6d4" // cyan-500 to match gradient
            />
          </div>

          {/* Vision Metrics / Value Propositions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-white mb-1">
                {t("about.coverage.regional")}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {t("about.coverage.regionalDesc")}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-white mb-1">
                {t("about.coverage.aiFirst")}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {t("about.coverage.aiFirstDesc")}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-white mb-1">
                {t("about.coverage.complexity")}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {t("about.coverage.complexityDesc")}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-white mb-1">
                {t("about.coverage.spanish")}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {t("about.coverage.spanishDesc")}
              </p>
            </div>
          </div>

          {/* Origin Story */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t("about.coverage.origin")}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
} 