import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Suspense } from "react"
import { ConsentAwareAnalytics } from "@/components/consent-aware-analytics"
import { CookieConsent } from "@/components/cookie-consent"
import { I18nProvider } from "@/components/i18n-provider"
import { SeoJsonLd } from "@/components/seo-json-ld"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://15palle.com"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Circolo sportivo 15 Palle | 15palle.com | Biliardo Bolzano",
    template: "%s | 15 Palle",
  },
  description:
    "15 Palle (15palle.com) – Il club di biliardo e bar a Bolzano. Tavoli professionali, atmosfera unica, comunità accogliente. Via Bruno Buozzi 12. Aperto tutti i giorni.",
  keywords: [
    "15palle",
    "15 Palle",
    "15palle.com",
    "biliardo Bolzano",
    "billiard club Bolzano",
    "biliardo",
    "billiard club",
    "bar Bolzano",
    "sport bar",
    "tavoli da biliardo",
    "Billiardclub 15 Palle",
  ],
  applicationName: "15 Palle",
  authors: [{ name: "15 Palle", url: siteUrl }],
  creator: "15 Palle",
  publisher: "15 Palle",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: siteUrl,
    siteName: "15 Palle - 15palle.com",
    title: "Circolo sportivo 15 Palle | 15palle.com | Biliardo Bolzano",
    description:
      "15 Palle (15palle.com) – Club di biliardo e bar a Bolzano. Tavoli professionali, atmosfera unica. Via Bruno Buozzi 12.",
    images: [
      {
        url: "/logo.webp",
        width: 512,
        height: 512,
        alt: "Circolo sportivo 15 Palle Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Circolo sportivo 15 Palle | 15palle.com",
    description: "15 Palle – Club di biliardo e bar a Bolzano. Tavoli professionali, atmosfera unica.",
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
  other: {
    "geo.region": "IT-BZ",
    "geo.placename": "Bolzano",
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
        <SeoJsonLd />
        <I18nProvider initialLanguage={lang}>
          <Suspense fallback={null}>{children}</Suspense>
          <CookieConsent />
        </I18nProvider>
        <ConsentAwareAnalytics />
      </body>
    </html>
  )
}
