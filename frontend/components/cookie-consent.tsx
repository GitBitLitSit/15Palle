"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DEFAULT_PREFERENCES,
  readStoredConsent,
  saveStoredConsent,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent"

export function CookieConsent() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const isKioskRoute = pathname?.startsWith("/kiosk") || pathname?.startsWith("/counter")
  const [isOpen, setIsOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [preferences, setPreferences] = useState<CookieConsentPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    if (isKioskRoute) return
    const stored = readStoredConsent()
    if (stored) {
      setPreferences(stored.preferences)
      setIsOpen(false)
    } else {
      setIsOpen(true)
    }
  }, [isKioskRoute])

  const acceptAll = () => {
    const next = { necessary: true, analytics: true, marketing: true }
    saveStoredConsent(next)
    setPreferences(next)
    setIsOpen(false)
    setExpanded(false)
  }

  const rejectAll = () => {
    const next = { necessary: true, analytics: false, marketing: false }
    saveStoredConsent(next)
    setPreferences(next)
    setIsOpen(false)
    setExpanded(false)
  }

  const savePreferences = () => {
    saveStoredConsent(preferences)
    setIsOpen(false)
    setExpanded(false)
  }

  if (isKioskRoute) return null

  if (!isOpen) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur animate-slide-up">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_45%),radial-gradient(circle_at_top_right,rgba(245,215,66,0.06),transparent_45%)]" />
        <div className="relative flex flex-col gap-5 p-6 md:p-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground md:text-xl">{t("cookie.title")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("cookie.description")}</p>
              <p className="text-xs text-muted-foreground">{t("cookie.changeHint")}</p>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 sm:gap-3 lg:justify-end">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full px-4 text-sm font-semibold"
                onClick={rejectAll}
              >
                {t("cookie.rejectAll")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border-border/70 bg-background/60 px-4 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-background/80"
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
                aria-controls="cookie-preferences"
              >
                {expanded ? t("cookie.hidePreferences") : t("cookie.managePreferences")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full px-4 text-sm font-semibold shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                onClick={acceptAll}
              >
                {t("cookie.acceptAll")}
              </Button>
            </div>
          </div>

          {expanded ? (
            <div id="cookie-preferences" className="border-t border-border/60 pt-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background/60 p-4 transition-colors hover:bg-background/80">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <label htmlFor="cookie-necessary" className="text-sm font-medium text-foreground">
                        {t("cookie.necessaryTitle")}
                      </label>
                      <p className="mt-1 text-xs text-muted-foreground">{t("cookie.necessaryDesc")}</p>
                    </div>
                    <Switch id="cookie-necessary" checked disabled aria-label={t("cookie.necessaryTitle")} />
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/60 p-4 transition-colors hover:bg-background/80">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <label htmlFor="cookie-analytics" className="text-sm font-medium text-foreground">
                        {t("cookie.analyticsTitle")}
                      </label>
                      <p className="mt-1 text-xs text-muted-foreground">{t("cookie.analyticsDesc")}</p>
                    </div>
                    <Switch
                      id="cookie-analytics"
                      checked={preferences.analytics}
                      onCheckedChange={(checked) =>
                        setPreferences((prev) => ({ ...prev, analytics: checked }))
                      }
                      aria-label={t("cookie.analyticsTitle")}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/60 p-4 transition-colors hover:bg-background/80">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <label htmlFor="cookie-marketing" className="text-sm font-medium text-foreground">
                        {t("cookie.marketingTitle")}
                      </label>
                      <p className="mt-1 text-xs text-muted-foreground">{t("cookie.marketingDesc")}</p>
                    </div>
                    <Switch
                      id="cookie-marketing"
                      checked={preferences.marketing}
                      onCheckedChange={(checked) =>
                        setPreferences((prev) => ({ ...prev, marketing: checked }))
                      }
                      aria-label={t("cookie.marketingTitle")}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" className="rounded-full px-5" onClick={savePreferences}>
                  {t("cookie.savePreferences")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
