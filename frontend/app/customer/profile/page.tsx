"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Printer, Download } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import type { Member } from "@/lib/types"
import { escapeHtml } from "@/lib/utils"

export default function CustomerProfilePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [member, setMember] = useState<Member | null>(null)
  const qrCodeRef = useRef<HTMLDivElement | null>(null)
  const membershipPassRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const sessionMember = sessionStorage.getItem("currentMember")
    const legacyMember = localStorage.getItem("currentMember")
    const memberData = sessionMember ?? legacyMember
    if (memberData) {
      setMember(JSON.parse(memberData))
      if (!sessionMember && legacyMember) {
        sessionStorage.setItem("currentMember", legacyMember)
        localStorage.removeItem("currentMember")
      }
    } else {
      // Redirect to login if no member data found
      router.replace("/login")
    }
  }, [router])

  const handleSignOut = () => {
    sessionStorage.removeItem("currentMember")
    localStorage.removeItem("currentMember")
    router.push("/")
  }

  const handlePrintQrCode = () => {
    if (!member) {
      return
    }

    const qrCodeElement = qrCodeRef.current?.querySelector("svg")
    if (!qrCodeElement) {
      return
    }

    const serializer = new XMLSerializer()
    let svgMarkup = serializer.serializeToString(qrCodeElement)

    if (!svgMarkup.includes("xmlns=")) {
      svgMarkup = svgMarkup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    }

    const printWindow = window.open("", "qr-code-print", "width=600,height=600")
    if (!printWindow) {
      return
    }

    const safeName = `${escapeHtml(member.firstName)} ${escapeHtml(member.lastName)}`.trim()
    const safeEmail = escapeHtml(member.email)

    printWindow.document.open()
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Member QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 24px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 16px;
            }
            .meta {
              text-align: center;
            }
            .qr {
              border: 1px solid #e5e7eb;
              padding: 16px;
              border-radius: 12px;
              background: #ffffff;
            }
          </style>
        </head>
        <body>
          <div class="meta">
            <div style="font-size: 18px; font-weight: 700;">${safeName}</div>
            <div style="font-size: 14px; color: #6b7280;">${safeEmail}</div>
          </div>
          <div class="qr">${svgMarkup}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }
  }

  const handleDownloadQrCode = () => {
    if (!member) {
      return
    }

    const qrCodeElement = qrCodeRef.current?.querySelector("svg")
    if (!qrCodeElement) {
      return
    }

    const serializer = new XMLSerializer()
    let svgMarkup = serializer.serializeToString(qrCodeElement)

    if (!svgMarkup.includes("xmlns=")) {
      svgMarkup = svgMarkup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    }

    const drawRoundedRect = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
    ) => {
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
    }

    const fileBase = t("profile.membershipPassFileName", "15Palle-MembershipPass")
    const safeFileBase = fileBase.trim().replace(/\s+/g, "-") || "15Palle-MembershipPass"

    const passRect = membershipPassRef.current?.getBoundingClientRect()
    const passWidth = Math.max(360, Math.round(passRect?.width ?? 380))
    const targetHeight = Math.max(620, Math.round(passWidth * 1.55))
    const passHeight = Math.max(targetHeight, Math.round(passRect?.height ?? 560))
    const scale = 3

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(passWidth * scale)
    canvas.height = Math.round(passHeight * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return
    }

    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(svgBlob)
    const image = new Image()
    image.onload = () => {
      ctx.scale(scale, scale)

      const fontFamily = "Inter, Arial, sans-serif"
      const passLabel = t("profile.membershipPass", "Membership Pass")
      const memberSinceLabel = t("profile.memberSince", "Member Since")
      const fullName = `${member.firstName} ${member.lastName}`.trim()
      const memberSinceDate = new Date(member.createdAt).toLocaleDateString()
      const memberSinceText = `${memberSinceLabel}: ${memberSinceDate}`

      const drawFitText = (
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        baseSize: number,
        minSize: number,
        weight = 600,
      ) => {
        let size = baseSize
        while (size > minSize) {
          ctx.font = `${weight} ${size}px ${fontFamily}`
          if (ctx.measureText(text).width <= maxWidth) {
            break
          }
          size -= 1
        }
        ctx.fillText(text, x, y)
      }

      const outerRadius = 40
      const outerGradient = ctx.createLinearGradient(0, 0, passWidth, passHeight)
      outerGradient.addColorStop(0, "#0f172a")
      outerGradient.addColorStop(0.55, "#0b1222")
      outerGradient.addColorStop(1, "#020617")
      drawRoundedRect(ctx, 0, 0, passWidth, passHeight, outerRadius)
      ctx.fillStyle = outerGradient
      ctx.fill()
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)"
      ctx.lineWidth = 1
      ctx.stroke()

      const innerPadding = 20
      const innerX = innerPadding
      const innerY = innerPadding
      const innerW = passWidth - innerPadding * 2
      const innerH = passHeight - innerPadding * 2
      const innerRadius = 32
      const innerGradient = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH)
      innerGradient.addColorStop(0, "rgba(30, 41, 59, 0.98)")
      innerGradient.addColorStop(0.6, "rgba(15, 23, 42, 0.98)")
      innerGradient.addColorStop(1, "rgba(2, 6, 23, 0.98)")
      drawRoundedRect(ctx, innerX, innerY, innerW, innerH, innerRadius)
      ctx.fillStyle = innerGradient
      ctx.fill()
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)"
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.save()
      drawRoundedRect(ctx, innerX, innerY, innerW, innerH, innerRadius)
      ctx.clip()

      const glowTop = ctx.createRadialGradient(
        innerX + innerW * 0.85,
        innerY + innerH * 0.1,
        0,
        innerX + innerW * 0.85,
        innerY + innerH * 0.1,
        innerW * 0.7,
      )
      glowTop.addColorStop(0, "rgba(56, 189, 248, 0.35)")
      glowTop.addColorStop(1, "rgba(56, 189, 248, 0)")
      ctx.fillStyle = glowTop
      ctx.fillRect(innerX, innerY, innerW, innerH)

      const glowBottom = ctx.createRadialGradient(
        innerX + innerW * 0.15,
        innerY + innerH * 0.85,
        0,
        innerX + innerW * 0.15,
        innerY + innerH * 0.85,
        innerW * 0.7,
      )
      glowBottom.addColorStop(0, "rgba(168, 85, 247, 0.28)")
      glowBottom.addColorStop(1, "rgba(168, 85, 247, 0)")
      ctx.fillStyle = glowBottom
      ctx.fillRect(innerX, innerY, innerW, innerH)
      ctx.restore()

      const centerX = passWidth / 2

      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(226, 232, 240, 0.7)"
      ctx.font = `600 18px ${fontFamily}`
      ctx.fillText(passLabel.toUpperCase(), centerX, innerY + 64)

      ctx.fillStyle = "#f8fafc"
      drawFitText(fullName, centerX, innerY + 114, innerW - 48, 44, 30, 700)

      ctx.fillStyle = "rgba(226, 232, 240, 0.78)"
      drawFitText(member.email, centerX, innerY + 162, innerW - 56, 22, 17, 500)
      ctx.fillStyle = "rgba(148, 163, 184, 0.9)"
      drawFitText(memberSinceText, centerX, innerY + 190, innerW - 56, 18, 13, 600)

      const headerHeight = 248
      const maxQr = innerW * 0.72
      const bottomPadding = 48
      const available = innerH - headerHeight - bottomPadding
      const qrSize = Math.max(140, Math.min(maxQr, available))
      const qrX = centerX - qrSize / 2
      const qrY = innerY + headerHeight + Math.max(8, (available - qrSize) / 2)
      const qrPadding = 14

      drawRoundedRect(ctx, qrX - qrPadding, qrY - qrPadding, qrSize + qrPadding * 2, qrSize + qrPadding * 2, 24)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
      ctx.strokeStyle = "rgba(15, 23, 42, 0.12)"
      ctx.stroke()

      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(image, qrX, qrY, qrSize, qrSize)
      ctx.restore()

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            URL.revokeObjectURL(svgUrl)
            return
          }
          const downloadUrl = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = downloadUrl
          link.download = `${safeFileBase}.png`
          link.click()
          URL.revokeObjectURL(downloadUrl)
          URL.revokeObjectURL(svgUrl)
        },
        "image/png",
        1,
      )
    }
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl)
    }
    image.src = svgUrl
  }

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">{t("profile.loading")}</p>
        </div>
      </div>
    )
  }

  const memberSinceDate = new Date(member.createdAt).toLocaleDateString()

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="mb-2 text-3xl font-bold">{t("profile.title")}</h1>
                <p className="text-muted-foreground">{t("profile.subtitle")}</p>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-72 -translate-y-1/2 bg-primary/20 blur-[140px]" />
              <div className="mx-auto flex justify-center">
                <Card className="group relative w-full max-w-3xl overflow-hidden border-muted/40 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                  <CardHeader className="relative z-10">
                    <div>
                      <CardTitle>{t("profile.yourQrCode")}</CardTitle>
                      <CardDescription>{t("profile.presentToScan")}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div
                      ref={membershipPassRef}
                      className="relative mx-auto w-full max-w-lg rounded-2xl border border-muted/50 bg-gradient-to-br from-primary/10 via-background to-background p-6 text-center shadow-sm lg:max-w-xl"
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent" />
                      <div className="relative space-y-6">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {t("profile.membershipPass")}
                          </p>
                          <p className="font-bold text-2xl">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-muted-foreground text-base">
                            {member.email}
                          </p>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            {t("profile.memberSince")} · {memberSinceDate}
                          </p>
                          <div className="flex justify-center">
                            {member.blocked ? (
                              <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600">
                                {t("profile.accountBlocked")}
                              </span>
                            ) : member.emailValid ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                                {t("profile.activeMember")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-muted/40 bg-muted/10 px-3 py-1 text-xs font-semibold text-muted-foreground">
                                {t("profile.pendingVerification")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div
                            ref={qrCodeRef}
                            className="rounded-lg border bg-white p-4 shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
                          >
                            <QRCodeSVG value={member.qrUuid} size={220} level="H" />
                          </div>
                        </div>

                        <div className="rounded-full border border-muted/40 bg-background/80 px-4 py-2 shadow-sm">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={handlePrintQrCode}
                              size="icon"
                              variant="ghost"
                              className="size-10 rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/20"
                              aria-label="Print QR code"
                              title="Print QR code"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <div className="h-6 w-px bg-muted/60" />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleDownloadQrCode}
                              className="size-10 rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/20"
                              aria-label="Download QR code"
                              title="Download QR code"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
