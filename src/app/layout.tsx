import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { LanguageProvider } from "@/components/LanguageProvider"
import { MainNavbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/blocks/footer-section"
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar"
import AuthProvider from "@/components/AuthProvider"
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider"
import ChunkRecovery from "./_components/ChunkRecovery"
import { ToastLiveRegion } from "../hooks/use-toast"
import { Analytics } from '@vercel/analytics/react'
import { env } from "@/lib/env"
// Removed next-intl provider usage

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Briki Co‑Pilot — Asistente de Seguros con IA",
  description: "Tu primer asistente de seguros con IA — chatea y recibe planes reales en segundos.",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Language is handled by LanguageProvider and our custom hook
  const locale = 'es'
  // Non-blocking build banner (server-side only)
  // Logs once on server start to help identify build in prod logs
  console.log('Briki build', {
    commit: env.server.VERCEL_GIT_COMMIT_SHA ?? 'local',
    branch: env.server.VERCEL_GIT_COMMIT_REF ?? 'local'
  });
  // Note: The html lang is statically set to 'es' server-side.
  // For accessibility, we set it client-side based on LanguageProvider after hydration.
  return (
    <html lang={locale} suppressHydrationWarning className="scroll-smooth">
      <body className={inter.className}>
        {/* Soft console.error interceptor (non-throwing) */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `(()=>{try{var o=console.error.bind(console);console.error=function(){try{o.apply(console,arguments)}catch{} } }catch{}})();` }} />
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
            storageKey="briki-theme"
          >
            {/* Stale chunk auto-reload safety */}
            <ChunkRecovery />
            {/* Screen reader announcements for toasts */}
            <ToastLiveRegion />
            <LanguageProvider>
              <AuthProvider>
                <OnboardingProvider>
                  <ScrollProgressBar />
                  <MainNavbar />
                  <main className="content-frame pt-[calc(var(--nav-h)-8px)] pb-12 min-h-screen">
                    {children}
                  </main>
                  <Footer />
                </OnboardingProvider>
              </AuthProvider>
            </LanguageProvider>
        </ThemeProvider>
        {/* Vercel Web Analytics */}
        <Analytics />
      </body>
    </html>
  )
}
