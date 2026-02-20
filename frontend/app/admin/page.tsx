"use client"

import type React from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAdmin } from "@/lib/api"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogIn, Lock, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import Image from "next/image"

export default function AdminLoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownerUsername, setOwnerUsername] = useState("")
  const [ownerPassword, setOwnerPassword] = useState("")

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await loginAdmin({
        username: ownerUsername,
        password: ownerPassword,
      })

      console.log("[v0] Admin login successful:", result)

      if (result.token) {
        localStorage.setItem("token", result.token)
      }

      router.push("/owner/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.invalidCredentials"))
    } finally {
      setIsLoading(false)
    }
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
                    src="/lounge.webp"
                    alt="Billiard lounge"
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
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">{t("login.owner")}</p>
                      <h2 className="mt-3 text-3xl font-semibold">{t("login.welcomeTitle")}</h2>
                      <p className="mt-2 text-sm text-white/80">{t("login.welcomeSubtitle")}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-10">
                  <div className="mb-6">
                    <CardTitle className="text-2xl">{t("login.loginTitle")}</CardTitle>
                    <CardDescription className="mt-2 text-base">{t("login.signInOwner")}</CardDescription>
                  </div>

                  <form onSubmit={handleOwnerLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="owner-username">{t("login.username")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="owner-username"
                          type="text"
                          placeholder="admin"
                          value={ownerUsername}
                          onChange={(e) => setOwnerUsername(e.target.value)}
                          required
                          className="h-11 pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner-password">{t("login.password")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="owner-password"
                          type="password"
                          placeholder="Enter your password"
                          value={ownerPassword}
                          onChange={(e) => setOwnerPassword(e.target.value)}
                          required
                          className="h-11 pl-10"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    )}

                    <Button type="submit" className="w-full h-11 shadow-sm" disabled={isLoading}>
                      {isLoading ? t("login.signingIn") : t("login.signInOwner")}
                    </Button>
                  </form>
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
