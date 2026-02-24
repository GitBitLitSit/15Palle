import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Customer Area",
  alternates: {
    canonical: "/customer/profile",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return children
}
