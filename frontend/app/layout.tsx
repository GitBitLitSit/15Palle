import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Suspense } from "react"
import { ConsentAwareAnalytics } from "@/components/consent-aware-analytics"
import { CookieConsent } from "@/components/cookie-consent"
import { I18nProvider } from "@/components/i18n-provider"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  preload: false,
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://15palle.com"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "15 Palle - Billiard Club & Bar",
    template: "%s | 15 Palle",
  },
  description:
    "Billiard Club 15 Palle a Bolzano: biliardo professionale, bar, eventi e community per appassionati.",
  applicationName: "15 Palle",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "15 Palle",
    "Billiard Club Bolzano",
    "Biliardo Bolzano",
    "Billiard Club & Bar",
    "Sala biliardo Alto Adige",
  ],
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: siteUrl,
    siteName: "15 Palle",
    title: "15 Palle - Billiard Club & Bar",
    description:
      "Il tuo club di biliardo e bar a Bolzano. Tavoli professionali, ambiente accogliente e community.",
    images: [
      {
        url: "/tableUpscale.webp",
        width: 1200,
        height: 630,
        alt: "Interno del Billiard Club 15 Palle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "15 Palle - Billiard Club & Bar",
    description: "Billiard Club a Bolzano con tavoli professionali, bar ed eventi.",
    images: ["/tableUpscale.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    shortcut: ["/icon"],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
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
