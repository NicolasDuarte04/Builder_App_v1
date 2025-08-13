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
  title: "Briki - Asistente de Seguros con IA",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Non-blocking build banner (server-side only)
  // Logs once on server start to help identify build in prod logs
  console.log('Briki build', {
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? 'local'
  });
  return (
    <html lang="es" suppressHydrationWarning className="scroll-smooth">
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
