"use client"

import { useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ImageLightboxProps = {
  open: boolean
  onClose: () => void
  src: string
  alt: string
}

export function ImageLightbox({ open, onClose, src, alt }: ImageLightboxProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [open, handleEscape])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </Button>
      <div
        className="relative flex max-h-[90vh] w-full max-w-6xl items-center justify-center animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] w-auto max-w-full object-contain"
        />
      </div>
    </div>
  )
}
