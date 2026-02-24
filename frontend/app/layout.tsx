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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://15palle.com"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "15 Palle - Billiard Club & Bar | Biliardo e Bar",
    template: "%s | 15 Palle",
  },
  description:
    "15 Palle è il tuo club di biliardo e bar. Tavoli professionali, atmosfera unica e comunità accogliente. Aperto a Bolzano. Prenota o vieni a trovarci.",
  keywords: [
    "15 Palle",
    "biliardo",
    "billiard club",
    "bar",
    "Bolzano",
    "sport",
    "divertimento",
    "tavoli da biliardo",
  ],
  authors: [{ name: "15 Palle" }],
  creator: "15 Palle",
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: siteUrl,
    siteName: "15 Palle",
    title: "15 Palle - Billiard Club & Bar | Biliardo e Bar",
    description:
      "Il tuo club di biliardo e bar. Tavoli professionali, atmosfera unica, comunità accogliente. Bolzano.",
    images: [{ url: "/logo.webp", width: 512, height: 512, alt: "15 Palle Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "15 Palle - Billiard Club & Bar",
    description: "Il tuo club di biliardo e bar. Tavoli professionali, atmosfera unica. Bolzano.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
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
