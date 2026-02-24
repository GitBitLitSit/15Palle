import type { Metadata } from "next"
import type { ReactNode } from "react"

const title = "How to Reach 15 Palle in Bolzano"
const description =
  "Get directions to 15 Palle in Bolzano, including address, map, and contact details for our billiard club."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/maps",
  },
  openGraph: {
    title,
    description,
    url: "https://15palle.com/maps",
    images: ["/logo.webp"],
  },
  twitter: {
    title,
    description,
    images: ["/logo.webp"],
  },
}

export default function MapsLayout({ children }: { children: ReactNode }) {
  return children
}
