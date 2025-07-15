import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { LanguageProvider } from "@/components/LanguageProvider"
import { MainNavbar } from "@/components/layout/Navbar"
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar"
import AuthProvider from "@/components/AuthProvider"
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Briki Prompt Coach",
  description: "Talk to AI like a pro — even if you've never tried before. Learn to write better prompts and evaluate AI responses.",
  manifest: "/site.webmanifest",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className="scroll-smooth">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="briki-theme"
        >
          <LanguageProvider>
            <AuthProvider>
              <OnboardingProvider>
                <ScrollProgressBar />
                <MainNavbar />
                {children}
              </OnboardingProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
