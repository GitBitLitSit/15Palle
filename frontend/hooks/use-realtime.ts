"use client"

import { useEffect, useRef, useState } from "react"
import type { CheckInEvent } from "@/lib/types"

type RealtimeErrorCode = "MISSING_WEBSOCKET_URL" | "CONNECTION_ERROR"

const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development"

export function useRealtimeCheckIns(onCheckIn: (event: CheckInEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<RealtimeErrorCode | null>(null)

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_API_URL

    if (!wsUrl) {
      if (isDev) console.error("WebSocket URL is not configured")
      setError("MISSING_WEBSOCKET_URL")
      return
    }

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as CheckInEvent
        if (data.type === "NEW_CHECKIN") {
          onCheckIn(data)
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
    }

    return () => {
      ws.close()
    }
  }, [onCheckIn])

  return { isConnected, error }
}
