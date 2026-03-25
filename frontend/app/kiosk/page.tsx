"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { CheckInEvent } from "@/lib/types"
import { useRealtimeCheckIns } from "@/hooks/use-realtime"

const STORAGE_KEY = "kiosk:last-check-in:v1"

type KioskCheckInEvent = {
  type: "NEW_CHECKIN"
  member: { firstName: string; lastName: string } | null
  warning?: string | null
  warningCode?: "INVALID_QR" | "MEMBER_BLOCKED" | "SCANNED_TOO_OFTEN" | null
  timestamp?: string
  checkInTime?: string
}

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as KioskCheckInEvent
      setLastCheckIn(parsed)
    } catch {
      // Ignore localStorage parse errors
    }
  }, [])

  useEffect(() => {
    if (!lastCheckIn) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lastCheckIn))
    } catch {
      // LocalStorage might be disabled; kiosk still works via websocket.
    }
  }, [lastCheckIn])

  const handleNewCheckIn = useCallback((event: CheckInEvent) => {
    const displayEvent: KioskCheckInEvent = {
      type: "NEW_CHECKIN",
      member: event.member ? { firstName: event.member.firstName, lastName: event.member.lastName } : null,
      warning: event.warning ?? null,
      warningCode: event.warningCode ?? null,
      timestamp: event.timestamp,
      checkInTime: event.checkInTime,
    }
    setLastCheckIn(displayEvent)
    setPulse(() => {
      const code = event.warningCode ?? null
      if (code === "INVALID_QR" || code === "MEMBER_BLOCKED" || code === "SCANNED_TOO_OFTEN") return "error"
      return "success"
    })
    // Remove pulse after a short flash
    window.setTimeout(() => setPulse(null), 1400)
  }, [])

  const { isConnected, error: wsError } = useRealtimeCheckIns(handleNewCheckIn)

  const status = useMemo(() => {
    const code = lastCheckIn?.warningCode ?? null
    const denied = code === "INVALID_QR" || code === "MEMBER_BLOCKED" || code === "SCANNED_TOO_OFTEN"

    const memberName = lastCheckIn?.member
      ? `${lastCheckIn.member.firstName} ${lastCheckIn.member.lastName}`.trim()
      : null

    const warningText = (() => {
      if (!denied) return null
      if (code === "INVALID_QR") return t("dashboard.checkins.warnings.invalidQr")
      if (code === "MEMBER_BLOCKED") return t("dashboard.checkins.warnings.memberBlocked")
      if (code === "SCANNED_TOO_OFTEN") return t("dashboard.checkins.warnings.scannedTooOften")
      return (lastCheckIn?.warning ?? null)?.trim() || null
    })()

    return {
      denied,
      code,
      memberName,
      warningText,
      timeText: formatEventTime(lastCheckIn, language),
      dateText: formatEventDate(lastCheckIn, language),
    }
  }, [language, lastCheckIn, t])

  const headerText = status.denied ? t("dashboard.realtime.accessDenied") : t("dashboard.realtime.newCheckin")
  const mainName = status.memberName || t("dashboard.checkins.unknownMember")
  const subtitleText = status.denied
    ? status.warningText || t("dashboard.checkins.none")
    : t("dashboard.realtime.memberCheckedIn", {
        firstName: lastCheckIn?.member?.firstName || "",
        lastName: lastCheckIn?.member?.lastName || "",
      })

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

        <div className="relative p-6 sm:p-10 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {isConnected ? t("dashboard.realtimeConnected") : t("dashboard.realtimeDisconnected")}
              </div>
              {wsError && !isConnected && (
                <div className="text-xs text-destructive/90">
                  {t(`dashboard.realtimeErrors.${wsError}`, { defaultValue: wsError })}
                </div>
              )}
              <div className="text-lg font-bold tracking-tight text-foreground">{headerText}</div>
            </div>
          </div>

          {lastCheckIn ? (
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className={[
                  "text-[clamp(2.2rem,5vw,4.2rem)] font-extrabold leading-none break-words",
                  status.denied ? "text-destructive" : "text-primary",
                ].join(" ")}
              >
                {mainName}
              </div>

              <div className="text-base sm:text-lg text-muted-foreground max-w-[36ch] break-words">{subtitleText}</div>

              <div className="mt-2 flex flex-col items-center gap-1">
                {status.timeText && <div className="text-sm text-muted-foreground">{status.timeText}</div>}
                {status.dateText && <div className="text-xs text-muted-foreground">{status.dateText}</div>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-primary">{t("dashboard.checkins.none")}</div>
              <div className="text-base sm:text-lg text-muted-foreground max-w-[34ch]">{t("profile.scanHint")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

