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
const siteUrl = "https://15palle.com"
const defaultTitle = "15 Palle (15Palle) | Billiard Club & Bar in Bolzano"
const defaultDescription =
  "15 Palle is a billiard club and bar in Bolzano with professional tables, a friendly atmosphere, and extended opening hours."
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "15 Palle",
  alternateName: "15Palle",
  url: siteUrl,
  logo: `${siteUrl}/logo.webp`,
}
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "@id": `${siteUrl}/#localbusiness`,
  name: "15 Palle",
  url: siteUrl,
  image: `${siteUrl}/logo.webp`,
  telephone: "+39 392 810 0919",
  priceRange: "EUR",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Via Bruno Buozzi, 12",
    addressLocality: "Bolzano",
    postalCode: "39100",
    addressRegion: "BZ",
    addressCountry: "IT",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "14:30",
      closes: "01:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Sunday",
      opens: "14:30",
      closes: "23:59",
    },
  ],
}
const structuredData = [organizationSchema, localBusinessSchema]

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | 15 Palle",
  },
  description: defaultDescription,
  generator: "v0.app",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: defaultTitle,
    description: defaultDescription,
    siteName: "15 Palle",
    locale: "it_IT",
    images: [
      {
        url: "/logo.webp",
        width: 512,
        height: 512,
        alt: "15 Palle logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/logo.webp"],
  },
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
        {structuredData.map((schema) => (
          <script
            key={schema["@id"]}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <I18nProvider initialLanguage={lang}>
          <Suspense fallback={null}>{children}</Suspense>
          <CookieConsent />
        </I18nProvider>
        <ConsentAwareAnalytics />
      </body>
    </html>
  )
}
