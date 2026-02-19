import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Suspense } from "react"
import { ConsentAwareAnalytics } from "@/components/consent-aware-analytics"
import { CookieConsent } from "@/components/cookie-consent"
import { I18nProvider } from "@/components/i18n-provider"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "15 Palle - Billiard Club & Bar",
  description: "Premier billiard club and bar in Rome. Professional tables, great atmosphere, and welcoming community.",
  generator: "v0.app",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const lang = "it"

  return (
    <html lang={lang}>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <I18nProvider initialLanguage={lang}>
          <Suspense fallback={null}>{children}</Suspense>
          <CookieConsent />
        </I18nProvider>
        <ConsentAwareAnalytics />
      </body>
    </html>
  )
}
