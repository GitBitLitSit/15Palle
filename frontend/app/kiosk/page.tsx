"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
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

export default function KioskPage() {
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
    // Remove pulse after a short flash
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

  const { isConnected, error: wsError } = useRealtimeCheckIns(handleNewCheckIn, {
    wsUrl: process.env.NEXT_PUBLIC_KIOSK_WEBSOCKET_API_URL || process.env.NEXT_PUBLIC_WEBSOCKET_API_URL,
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

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-br from-primary/15 via-background to-background p-4 sm:p-8 flex items-center justify-center"
      style={{ touchAction: "manipulation" }}
    >
      <div
        className={[
          "relative w-full max-w-2xl overflow-hidden rounded-[32px] border bg-card/75 backdrop-blur-md shadow-2xl",
          status.denied ? "border-destructive/40" : "border-primary/40",
          pulse === "success" ? "ring-2 ring-primary/40" : "",
          pulse === "error" ? "ring-2 ring-destructive/30" : "",
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        <div
          className={[
            "absolute inset-0 bg-gradient-to-br opacity-90",
            status.denied ? "from-destructive/20 via-transparent to-transparent" : "from-primary/20 via-transparent to-transparent",
          ].join(" ")}
        />

        <div className="relative p-6 sm:p-10 flex flex-col items-center justify-center gap-6 min-h-[60vh]">
          {lastCheckIn ? (
            status.denied ? (
              <div className="flex flex-col items-center justify-center text-center gap-5">
                <div className="text-[clamp(8rem,28vw,16rem)] font-black leading-none text-destructive select-none">X</div>
                <div className="text-[clamp(1.1rem,2.6vw,2rem)] font-semibold text-destructive max-w-[26ch] break-words">
                  {errorText}
                </div>
                {status.timeText && <div className="text-xs text-muted-foreground">{status.timeText}</div>}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center gap-5">
                <div className="text-[clamp(8rem,28vw,16rem)] font-black leading-none text-green-500 select-none">✓</div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-center gap-3">
              <div className="text-[clamp(1.6rem,3.8vw,2.4rem)] font-bold text-primary">
                Scansiona il codice QR per effettuare il check-in
              </div>
            </div>
          )}
          {!isConnected && wsError && (
            <div className="text-xs text-destructive/90 text-center">{t(`dashboard.realtimeErrors.${wsError}`, { defaultValue: wsError })}</div>
          )}
        </div>
      </div>
    </div>
  )
}

