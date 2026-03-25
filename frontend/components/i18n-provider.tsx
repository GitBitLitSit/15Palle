"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { I18nextProvider } from "react-i18next"
import i18n, { getStoredLanguage, normalizeLanguage, setStoredLanguage } from "@/lib/i18n"

export function I18nProvider({
  initialLanguage,
  children,
}: {
  initialLanguage?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isKioskRoute = pathname === "/kiosk" || pathname === "/counter"

  // Use initialLanguage only on first mount so server and client first paint match (avoids "Login" vs "Accedi" hydration error).
  const resolvedInitial = normalizeLanguage(initialLanguage) || "it"
  const didSetInitial = useRef(false)
  if (!didSetInitial.current) {
    didSetInitial.current = true
    if (i18n.language !== resolvedInitial) {
      i18n.changeLanguage(resolvedInitial)
    }
  }

  useEffect(() => {
    // Dedicated check-in display: always Italian; do not overwrite user's global lang cookie from the dashboard PC.
    if (isKioskRoute) {
      void i18n.changeLanguage("it")
      return
    }
    const stored = getStoredLanguage()
    const nextLang = stored ?? resolvedInitial
    setStoredLanguage(nextLang)
  }, [initialLanguage, resolvedInitial, isKioskRoute])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

