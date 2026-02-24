import { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://15palle.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/owner/", "/customer/"] },
      { userAgent: "Googlebot", allow: "/", disallow: ["/owner/", "/customer/"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
