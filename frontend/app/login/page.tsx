"use client"

import type React from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestVerificationCode, verifyAndRecover } from "@/lib/api"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogIn, Mail, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import Image from "next/image"

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Customer login states
  const [customerEmail, setCustomerEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [displayedCode, setDisplayedCode] = useState<string | null>(null)

  const handleCustomerEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!customerEmail || !customerEmail.includes("@")) {
      setError(t("login.validationEmail"))
      setIsLoading(false)
      return
    }

    try {
      const result = await requestVerificationCode(customerEmail)

      // If backend returns code for display mode
      if (result.verificationCode) {
        setDisplayedCode(result.verificationCode)
      }

      setStep("code")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failedSend"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomerCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (verificationCode.length !== 6) {
      setError(t("login.validationCode"))
      setIsLoading(false)
      return
    }

    try {
      const result = await verifyAndRecover({
        email: customerEmail,
        verificationCode,
        deliveryMethod: "display",
      })
      // Store member data in sessionStorage
      if (result.member) {
        sessionStorage.setItem("currentMember", JSON.stringify(result.member))
        localStorage.removeItem("currentMember")
      }

      router.push("/customer/profile")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.invalidCode"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep("email")
    setVerificationCode("")
    setDisplayedCode(null)
    setError(null)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1 flex items-center bg-gradient-to-b from-primary/10 via-background to-background pt-24 pb-16 md:pt-28 md:pb-20">
        <div className="container mx-auto w-full px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center lg:hidden">
              <LogIn className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h1 className="mb-2 text-3xl font-bold text-balance">{t("login.welcomeTitle")}</h1>
              <p className="text-muted-foreground">{t("login.welcomeSubtitle")}</p>
            </div>

            <Card className="overflow-hidden border-border/60 bg-background/95 p-0 gap-0 shadow-2xl">
              <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
                <div className="relative hidden lg:block">
                  <Image
                    src="/table-upscale.webp"
                    alt="Billiard table"
                    fill
                    sizes="(min-width: 1024px) 55vw, 0vw"
                    quality={72}
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/80" />
                  <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full border border-white/20 bg-white/10 p-1">
                        <Image
                          src="/logo.webp"
                          alt="15 Palle"
                          width={44}
                          height={44}
                          sizes="44px"
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      </div>
                      <span className="text-sm font-semibold tracking-wide">15 Palle</span>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">{t("login.customer")}</p>
                      <h2 className="mt-3 text-3xl font-semibold">{t("login.welcomeTitle")}</h2>
                      <p className="mt-2 text-sm text-white/80">{t("login.welcomeSubtitle")}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-10">
                  <div className="mb-6">
                    <CardTitle className="text-2xl">{t("login.loginTitle")}</CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {step === "email" ? t("login.emailHint") : t("login.verificationCode")}
                    </CardDescription>
                  </div>

                  {step === "email" ? (
                    <form onSubmit={handleCustomerEmailSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="customer-email">{t("login.emailAddress")}</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="customer-email"
                            type="email"
                            placeholder="your.email@example.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            required
                            className="h-11 pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{t("login.emailHint")}</p>
                      </div>

                      {error && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                          <p className="text-sm text-destructive">{error}</p>
                        </div>
                      )}

                      <Button type="submit" className="w-full h-11 shadow-sm" disabled={isLoading}>
                        {isLoading ? t("login.sending") : t("login.sendCode")}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleCustomerCodeSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="verification-code">{t("login.verificationCode")}</Label>
                        <div className="relative">
                          <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="verification-code"
                            type="text"
                            placeholder="000000"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            required
                            maxLength={6}
                            className="h-11 pl-10 text-center text-lg tracking-widest"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("login.codeSentTo")} <strong>{customerEmail}</strong>
                        </p>
                      </div>

                      {displayedCode && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                          <p className="text-sm font-medium text-primary mb-1">Your verification code:</p>
                          <p className="text-2xl font-bold text-center tracking-widest text-primary">
                            {displayedCode}
                          </p>
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            (Display mode - code shown here)
                          </p>
                        </div>
                      )}

                      {error && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                          <p className="text-sm text-destructive">{error}</p>
                        </div>
                      )}

                      <Button type="submit" className="w-full h-11 shadow-sm" disabled={isLoading}>
                        {isLoading ? t("login.verifying") : t("login.viewQrCode")}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={handleBackToEmail}
                        disabled={isLoading}
                      >
                        {t("login.useDifferentEmail")}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
