import type { Metadata } from "next"
import type { ReactNode } from "react"

const title = "Privacy Policy"
const description = "Read the 15 Palle privacy policy and data protection information."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title,
    description,
    url: "https://15palle.com/privacy-policy",
    images: ["/logo.webp"],
  },
  twitter: {
    title,
    description,
    images: ["/logo.webp"],
  },
}

export default function PrivacyPolicyLayout({ children }: { children: ReactNode }) {
  return children
}
