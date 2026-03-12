"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface MarqueeProps {
  children: React.ReactNode
  className?: string
  /** Duration for one full cycle (both copies) in seconds. Default 30. */
  duration?: number
  /** Gap between items. Default "1rem". */
  gap?: string
}

/**
 * Seamless infinite marquee — content duplicates and animates left-to-right.
 * Uses translateX(-50%) so when the animation loops, the duplicate is in the
 * exact same position — no jerk or pause. Linear timing for constant speed.
 */
export function Marquee({ children, className, duration = 30, gap = "1rem" }: MarqueeProps) {
  return (
    <div className={cn("overflow-hidden w-full h-full min-h-0", className)}>
      <div
        className="flex h-full animate-marquee w-max min-w-max will-change-transform"
        style={
          {
            "--marquee-duration": `${duration}s`,
            gap,
          } as React.CSSProperties
        }
      >
        {/* First set — exactly duplicated for seamless loop */}
        <div className="flex h-full flex-shrink-0 items-stretch" style={{ gap }}>
          {children}
        </div>
        <div className="flex h-full flex-shrink-0 items-stretch" style={{ gap }} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}
