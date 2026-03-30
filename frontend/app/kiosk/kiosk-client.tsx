"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { QrCode, Shield, Wifi, WifiOff } from "lucide-react"
import type { KioskCheckInEvent } from "@/lib/types"
import { useRealtimeCheckIns } from "@/hooks/use-realtime"

const KIOSK_VISIBILITY_MS = 15_000

function parseEventDate(event: KioskCheckInEvent | null): Date | null {
  const raw = event?.timestamp ?? event?.checkInTime
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function formatEventTime(event: KioskCheckInEvent | null, language: string): string | null {
  const d = parseEventDate(event)
  if (!d) return null
  return d.toLocaleTimeString(language || undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatEventDate(event: KioskCheckInEvent | null, language: string): string | null {
  const d = parseEventDate(event)
  if (!d) return null
  return d.toLocaleDateString(language || undefined)
}

function useNowTick(intervalMs: number) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function VisibilityBar({ expiresAtMs }: { expiresAtMs: number | null }) {
  const now = useNowTick(80)
  const pct = useMemo(() => {
    if (!expiresAtMs || now == null) return 100
    const left = Math.max(0, expiresAtMs - now)
    return (left / KIOSK_VISIBILITY_MS) * 100
  }, [expiresAtMs, now])

  if (!expiresAtMs) return null
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-75 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function KioskClock({ language }: { language: string }) {
  const now = useNowTick(1000)
  const formatted = useMemo(() => {
    if (now == null) return null
    const d = new Date(now)
    return {
      time: d.toLocaleTimeString(language || undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      date: d.toLocaleDateString(language || undefined, { weekday: "long", day: "numeric", month: "long" }),
    }
  }, [language, now])

  if (!formatted) {
    return <div className="h-12 w-[min(100%,14rem)] rounded-md bg-muted/30" aria-hidden />
  }

  return (
    <div className="text-right tabular-nums">
      <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{formatted.time}</div>
      <div className="text-sm text-muted-foreground capitalize sm:text-base">{formatted.date}</div>
    </div>
  )
}

export default function KioskClient() {
  const { t, i18n } = useTranslation()
  const language = i18n.language || "it"

  const [lastCheckIn, setLastCheckIn] = useState<KioskCheckInEvent | null>(null)
  const [pulse, setPulse] = useState<"success" | "error" | null>(null)
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null)

  const handleNewCheckIn = useCallback((event: KioskCheckInEvent) => {
    setLastCheckIn(event)
    setExpiresAtMs(Date.now() + KIOSK_VISIBILITY_MS)
    setPulse(() => {
      const code = event.warningCode ?? null
      if (code === "INVALID_QR" || code === "MEMBER_BLOCKED" || code === "SCANNED_TOO_OFTEN") return "error"
      return "success"
    })
    window.setTimeout(() => setPulse(null), 1400)
  }, [])

  useEffect(() => {
    if (!expiresAtMs || !lastCheckIn) return
    const remainingMs = Math.max(0, expiresAtMs - Date.now())
    const timeoutId = window.setTimeout(() => {
      setLastCheckIn(null)
      setExpiresAtMs(null)
    }, remainingMs)
    return () => window.clearTimeout(timeoutId)
  }, [expiresAtMs, lastCheckIn])

  const { isConnected } = useRealtimeCheckIns(handleNewCheckIn, {
    // Prefer main realtime channel for reliability; kiosk channel remains as fallback.
    wsUrl: process.env.NEXT_PUBLIC_WEBSOCKET_API_URL || process.env.NEXT_PUBLIC_KIOSK_WEBSOCKET_API_URL,
  })

  const status = useMemo(() => {
    const code = lastCheckIn?.warningCode ?? null
    const denied = code === "INVALID_QR" || code === "MEMBER_BLOCKED" || code === "SCANNED_TOO_OFTEN"

    const warningText = (() => {
      if (!denied) return null
      if (code === "INVALID_QR") return t("dashboard.checkins.warnings.invalidQr", { lng: "it" })
      if (code === "MEMBER_BLOCKED") return t("dashboard.checkins.warnings.memberBlocked", { lng: "it" })
      if (code === "SCANNED_TOO_OFTEN") return t("dashboard.checkins.warnings.scannedTooOften", { lng: "it" })
      return (lastCheckIn?.warning ?? null)?.trim() || null
    })()

    return {
      denied,
      code,
      warningText,
      timeText: formatEventTime(lastCheckIn, language),
      dateText: formatEventDate(lastCheckIn, language),
    }
  }, [language, lastCheckIn, t])

  const errorText = status.warningText || t("dashboard.checkins.warnings.invalidQr", { lng: "it" })
  const memberName = lastCheckIn?.memberName?.trim() || null

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-background"
      style={{ touchAction: "manipulation" }}
    >
      {/* Decorative background — abstract only, no venue photos (privacy-friendly) */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,oklch(0.52_0.11_240/0.35),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_100%,oklch(0.55_0.15_145/0.12),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:radial-gradient(oklch(0.5_0_0/0.12)_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-8 sm:py-10">
        {/* Brand bar */}
        <header className="mb-4 flex items-center justify-between gap-4 sm:mb-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 blur-md" aria-hidden />
              <div className="relative rounded-full border border-primary/30 bg-card/80 p-1.5 shadow-lg backdrop-blur-sm">
                <Image
                  src="/logo.webp"
                  alt=""
                  width={56}
                  height={56}
                  sizes="56px"
                  className="h-14 w-14 rounded-full object-cover"
                  priority
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">15 Palle</h1>
          </div>

          <div className="flex items-center justify-end gap-4 sm:gap-8">
            <div
              className={[
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-sm sm:text-base",
                isConnected
                  ? "border-accent/40 bg-accent/10 text-accent-foreground"
                  : "border-destructive/30 bg-destructive/10 text-destructive",
              ].join(" ")}
            >
              {isConnected ? <Wifi className="h-3.5 w-3.5" aria-hidden /> : <WifiOff className="h-3.5 w-3.5" aria-hidden />}
              {isConnected ? "Connessione attiva" : "Connessione assente"}
            </div>
            <KioskClock language={language} />
          </div>
        </header>

        <div
          className={[
            "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border bg-card/80 shadow-2xl backdrop-blur-xl sm:rounded-[36px]",
            status.denied ? "border-destructive/35" : "border-primary/35",
            pulse === "success" ? "ring-2 ring-accent/50 ring-offset-2 ring-offset-background" : "",
            pulse === "error" ? "ring-2 ring-destructive/40 ring-offset-2 ring-offset-background" : "",
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          <div
            className={[
              "pointer-events-none absolute inset-0 opacity-[0.5]",
              status.denied
                ? "bg-[radial-gradient(ellipse_at_30%_0%,oklch(0.55_0.22_25/0.2),transparent_50%)]"
                : "bg-[radial-gradient(ellipse_at_30%_0%,oklch(0.52_0.11_240/0.18),transparent_50%)]",
            ].join(" ")}
            aria-hidden
          />

          <div className="relative flex flex-1 flex-col justify-center gap-6 p-5 sm:p-10 md:p-12">
            {lastCheckIn ? (
              status.denied ? (
                <div className="flex flex-col items-center justify-center text-center">
                  <div
                    className="mb-6 flex h-36 w-36 shrink-0 items-center justify-center rounded-full border-4 border-destructive/50 bg-destructive/10 shadow-inner sm:h-44 sm:w-44"
                    aria-hidden
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-[58%] w-[58%] text-destructive"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </div>
                  {memberName && (
                    <p className="mb-3 max-w-xl text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {memberName}
                    </p>
                  )}
                  <p className="max-w-xl text-balance text-2xl font-semibold text-destructive sm:text-3xl">{errorText}</p>
                  {(status.timeText || status.dateText) && (
                    <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                      {[status.dateText, status.timeText].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative mb-8" aria-hidden>
                    <div className="absolute inset-0 animate-pulse-glow rounded-full opacity-60" />
                    <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-accent/60 bg-gradient-to-br from-accent/25 to-accent/5 shadow-lg sm:h-48 sm:w-48">
                      <svg
                        className="h-24 w-24 text-accent sm:h-28 sm:w-28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                  </div>
                  {memberName ? (
                    <>
                      <p className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{memberName}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
                        Ingresso registrato
                      </p>
                    </>
                  ) : (
                    <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Ingresso registrato</p>
                  )}
                  <p className="mt-3 max-w-md text-balance text-lg text-muted-foreground sm:text-xl">
                    Tessera valida — buon divertimento.
                  </p>
                  {(status.timeText || status.dateText) && (
                    <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                      {[status.dateText, status.timeText].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-10">
                  <div
                    className="absolute -inset-8 rounded-full bg-primary/10 blur-2xl animate-pulse-glow"
                    style={{ animationDuration: "3s" }}
                    aria-hidden
                  />
                  <div className="relative flex flex-col items-center gap-6">
                    <div className="rounded-3xl border border-primary/25 bg-primary/5 p-8 shadow-inner">
                      <QrCode className="h-28 w-28 text-primary sm:h-32 sm:w-32" strokeWidth={1.25} aria-hidden />
                    </div>
                  </div>
                </div>
                <p className="max-w-lg text-balance text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  Scansiona il codice QR per effettuare il check-in
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:text-base">
              <Shield className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
              <span>Display riservato</span>
            </div>
            <div className="mt-2">
              <VisibilityBar expiresAtMs={expiresAtMs} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
