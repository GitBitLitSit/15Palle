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
    default: "Circolo sportivo 15 Palle",
    template: "%s | Circolo sportivo 15 Palle",
  },
  description:
    "Circolo sportivo 15 Palle (15palle.com) – Tavoli professionali, atmosfera unica, comunità accogliente. Via Bruno Buozzi 12. Aperto tutti i giorni.",
  keywords: [
    "15palle",
    "15 Palle",
    "Circolo sportivo 15 Palle",
    "15palle.com",
    "biliardo Bolzano",
    "circolo biliardo Bolzano",
    "biliardo",
    "bar Bolzano",
    "sport bar",
    "tavoli da biliardo",
  ],
  applicationName: "Circolo sportivo 15 Palle",
  authors: [{ name: "Circolo sportivo 15 Palle", url: siteUrl }],
  creator: "Circolo sportivo 15 Palle",
  publisher: "Circolo sportivo 15 Palle",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: siteUrl,
    siteName: "Circolo sportivo 15 Palle",
    title: "Circolo sportivo 15 Palle",
    description:
      "Circolo sportivo 15 Palle (15palle.com) – Tavoli professionali, atmosfera unica. Via Bruno Buozzi 12.",
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
    title: "Circolo sportivo 15 Palle",
    description: "Circolo sportivo 15 Palle (15palle.com) – Tavoli professionali, atmosfera unica.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: "FGnmR22jKRFLlfhsiRWbMRgVusHc7o3m2AUUkV3yFMU",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
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
    <html lang={lang} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`} suppressHydrationWarning>
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
