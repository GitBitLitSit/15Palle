"use client"

import { useEffect, useRef, useState } from "react"

type RealtimeErrorCode = "MISSING_WEBSOCKET_URL" | "CONNECTION_ERROR"
type UseRealtimeOptions = { wsUrl?: string }

const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development"

function normalizeWebSocketUrl(input: string): string {
  const raw = input.trim()
  if (!raw) return raw

  // Next/hosting env interpolation can break "$default". Normalize common cases.
  if (raw.includes("/$default")) {
    return raw.replace("/$default", "/%24default")
  }
  if (/^wss:\/\/[^/]+\.execute-api\.[^/]+\/default$/i.test(raw)) {
    return raw.replace(/\/default$/i, "/%24default")
  }
  if (/^wss:\/\/[^/]+\.execute-api\.[^/]+\/$/i.test(raw)) {
    return `${raw}%24default`
  }
  if (/^wss:\/\/[^/]+\.execute-api\.[^/]+$/i.test(raw)) {
    return `${raw}/%24default`
  }
  return raw
}

export function useRealtimeCheckIns<TEvent extends { type: string }>(
  onCheckIn: (event: TEvent) => void,
  options?: UseRealtimeOptions,
) {
  const onCheckInRef = useRef(onCheckIn)
  onCheckInRef.current = onCheckIn

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const shouldReconnectRef = useRef(true)

  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<RealtimeErrorCode | null>(null)

  useEffect(() => {
    const provided = options?.wsUrl || process.env.NEXT_PUBLIC_WEBSOCKET_API_URL
    const wsUrl = provided ? normalizeWebSocketUrl(provided) : provided

    if (!wsUrl) {
      if (isDev) console.error("WebSocket URL is not configured")
      setError("MISSING_WEBSOCKET_URL")
      return
    }

    shouldReconnectRef.current = true

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const scheduleReconnect = () => {
      if (!shouldReconnectRef.current) return
      clearReconnectTimer()
      const attempt = attemptRef.current
      const delayMs = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5))
      attemptRef.current = attempt + 1
      reconnectTimerRef.current = setTimeout(() => connect(), delayMs)
    }

    const connect = () => {
      if (!shouldReconnectRef.current) return
      clearReconnectTimer()
      try {
        wsRef.current?.close()
      } catch {
        /* ignore */
      }

      if (isDev) {
        const u = wsUrl.trim()
        const looksBroken =
          /\/$/i.test(u) ||
          /\/default$/i.test(u) ||
          (/\/\$?$/i.test(u) && !u.includes("%24"))
        if (looksBroken && !u.includes("%24")) {
          console.error(
            "[realtime] WebSocket URL may be wrong: Next.js expands `$` in `.env.local`. Use `/%24default` in the URL (not `/$default`). Current value:",
            u,
          )
        } else {
          console.info("[realtime] Connecting to", u)
        }
      }

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        attemptRef.current = 0
        setIsConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TEvent
          if (data.type === "NEW_CHECKIN") {
            onCheckInRef.current(data)
          }
        } catch {
          if (isDev) console.error("Failed to parse WebSocket message")
        }
      }

      ws.onerror = () => {
        setError("CONNECTION_ERROR")
      }

      ws.onclose = () => {
        setIsConnected(false)
        wsRef.current = null
        if (shouldReconnectRef.current) {
          scheduleReconnect()
        }
      }
    }

    connect()

    return () => {
      shouldReconnectRef.current = false
      clearReconnectTimer()
      try {
        wsRef.current?.close()
      } catch {
        /* ignore */
      }
      wsRef.current = null
    }
  }, [options?.wsUrl])

  return { isConnected, error }
}
