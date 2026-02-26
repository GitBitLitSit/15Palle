/**
 * JSON-LD structured data for 15 Palle so Google can show rich results
 * and associate searches like "15palle" / "15 Palle" with the website.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://15palle.com"

export function SeoJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#organization`,
    name: "Circolo sportivo 15 Palle",
    alternateName: ["15 Palle", "15palle", "15palle.com", "15 Palle Biliardo", "Circolo 15 Palle"],
    url: siteUrl,
    description:
      "Circolo sportivo 15 Palle a Bolzano: biliardo professionale, bar, eventi e community per appassionati. Tavoli professionali, atmosfera unica. Via Bruno Buozzi 12.",
    image: `${siteUrl}/logo.webp`,
    logo: `${siteUrl}/logo.webp`,
    telephone: "+39 392 810 0919",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Via Bruno Buozzi, 12",
      addressLocality: "Bolzano",
      postalCode: "39100",
      addressRegion: "BZ",
      addressCountry: "IT",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 46.4983,
      longitude: 11.3548,
    },
    sameAs: [],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "16:00",
      closes: "02:00",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
