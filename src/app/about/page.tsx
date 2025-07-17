"use client";

import React from "react";
import { useTranslation } from "@/hooks/useTranslation";

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-neutral-700 text-neutral-200 mb-6">
              {t("about.hero.badge")}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              {t("about.hero.title")}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t("about.hero.subtitle")}
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button className="group inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500 h-11 px-8 shadow-lg">
                {t("about.hero.cta")}
              </button>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[calc(50%-4rem)] top-10 -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:left-48 lg:top-[calc(50%-30rem)] xl:left-[calc(50%-24rem)]">
            <div className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-blue-500 to-cyan-400 opacity-30" />
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("about.mission.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              {t("about.mission.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white dark:bg-slate-900 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Key Features</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Why thousands of users trust Briki for their insurance needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border border-blue-200/50">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center mb-6">
                <div className="h-6 w-6 text-white">✨</div>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Briki Compares, So You Don't Have To</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our AI analyzes thousands of insurance plans in seconds, comparing the details that actually matter to you — not the fine print that doesn't.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border border-blue-200/50">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center mb-6">
                <div className="h-6 w-6 text-white">📊</div>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">See What You're Actually Buying</h3>
              <p className="text-gray-600 dark:text-gray-300">
                We translate insurance-speak into plain English with visual breakdowns that show exactly what's covered and what's not — no surprises later.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow border border-blue-200/50">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center mb-6">
                <div className="h-6 w-6 text-white">⏱️</div>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Covered in Clicks, Not Days</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Say goodbye to endless forms and phone trees. Get insured in minutes with our secure, paperless checkout that works on any device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Three Steps to Peace of Mind
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              The simplest way to get the right coverage, guaranteed
            </p>
          </div>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gray-200 dark:bg-gray-700 transform -translate-x-1/2 hidden md:block" />

            <div className="space-y-12 md:space-y-0 md:grid md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative md:px-8">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-xl shadow-md relative z-10 border border-blue-200/50">
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-center text-gray-900 dark:text-white">Quick Chat, Not a Questionnaire</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-center">
                    Tell Briki what matters to you in everyday language — we skip the insurance exam-style forms.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative md:px-8">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-xl shadow-md relative z-10 border border-blue-200/50">
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-center text-gray-900 dark:text-white">See the Full Picture</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-center">
                    Watch as Briki instantly surfaces the best options side-by-side with what makes each one unique for your situation.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative md:px-8">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-xl shadow-md relative z-10 border border-blue-200/50">
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-center text-gray-900 dark:text-white">Protected in Minutes</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-center">
                    Choose your plan, checkout securely, and receive instant digital proof of coverage — all before your coffee gets cold.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="bg-gray-50 dark:bg-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">People Like You Trust Briki</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Join thousands who've discovered how insurance shopping should feel
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            {/* These would normally be real logos, using placeholders here */}
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="flex justify-center">
                <div className="h-12 bg-gray-300/30 dark:bg-gray-600/30 rounded-md flex items-center justify-center px-8 w-full">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Company {index}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="mt-16 grid md:grid-cols-2 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white dark:bg-slate-700 p-6 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 mr-3"></div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">John D.</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Travel Insurance Customer</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                "Briki made finding travel insurance so easy. I compared options and got coverage in under 5 minutes!"
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white dark:bg-slate-700 p-6 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 mr-3"></div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Sarah M.</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pet Insurance Customer</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                "I was able to find affordable coverage for my dog with pre-existing conditions thanks to Briki's comparison tools."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Briki Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("about.whyBriki.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              {t("about.whyBriki.subtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="border-0 shadow-lg bg-white dark:bg-slate-800 rounded-lg p-6 border border-blue-200/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 mb-4">
                <div className="h-6 w-6 text-white">✅</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t("about.whyBriki.benefit1.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("about.whyBriki.benefit1.description")}
              </p>
            </div>
            
            <div className="border-0 shadow-lg bg-white dark:bg-slate-800 rounded-lg p-6 border border-blue-200/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 mb-4">
                <div className="h-6 w-6 text-white">💬</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t("about.whyBriki.benefit2.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("about.whyBriki.benefit2.description")}
              </p>
            </div>
            
            <div className="border-0 shadow-lg bg-white dark:bg-slate-800 rounded-lg p-6 border border-blue-200/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 mb-4">
                <div className="h-6 w-6 text-white">📄</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t("about.whyBriki.benefit3.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("about.whyBriki.benefit3.description")}
              </p>
            </div>
            
            <div className="border-0 shadow-lg bg-white dark:bg-slate-800 rounded-lg p-6 border border-blue-200/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 mb-4">
                <div className="h-6 w-6 text-white">⚡</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t("about.whyBriki.benefit4.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("about.whyBriki.benefit4.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("about.team.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              {t("about.team.description")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-8 text-center border border-blue-200/50">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 mb-6">
                <div className="h-8 w-8 text-white">🛡️</div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t("about.team.expertise.title")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t("about.team.expertise.description")}
              </p>
            </div>
            
            <div className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-8 text-center border border-blue-200/50">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 mb-6">
                <div className="h-8 w-8 text-white">⚡</div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t("about.team.technology.title")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t("about.team.technology.description")}
              </p>
            </div>
            
            <div className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-8 text-center border border-blue-200/50">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 mb-6">
                <div className="h-8 w-8 text-white">👥</div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t("about.team.experience.title")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t("about.team.experience.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-95"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-white/10 rounded-full blur-3xl transform translate-x-1/4 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-white/10 rounded-full blur-3xl transform -translate-x-1/4 translate-y-1/4" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Stop Overpaying for Insurance You Don't Understand</h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto">
            Join 10,000+ smart shoppers who are saving money and getting better coverage with Briki's AI guidance.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-white text-blue-600 hover:bg-white/90 py-6 px-8 text-lg font-medium rounded-lg shadow-lg transition-colors hover:shadow-xl">
              Compare Plans Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
} 