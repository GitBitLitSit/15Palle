"use client"

import type React from "react"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { auth } from "@/lib/mock-api"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogIn, Mail, ShieldCheck, Lock, Info } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Customer login states
  const [customerEmail, setCustomerEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  // Owner login states
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerPassword, setOwnerPassword] = useState("")

  const handleCustomerEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!customerEmail || !customerEmail.includes("@")) {
      setError("Please enter a valid email address")
      setIsLoading(false)
      return
    }

    try {
      const result = await auth.sendVerificationCode(customerEmail)
      setGeneratedCode(result.code)
      setStep("code")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomerCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code")
      setIsLoading(false)
      return
    }

    try {
      await auth.verifyCode(customerEmail, verificationCode)
      router.push("/customer/profile")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await auth.loginOwner(ownerEmail, ownerPassword)
      router.push("/owner/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep("email")
    setVerificationCode("")
    setGeneratedCode(null)
    setError(null)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1 bg-gradient-to-b from-primary/5 to-background py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-md">
            <div className="mb-8 text-center">
              <LogIn className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h1 className="mb-2 text-3xl font-bold text-balance">Welcome to 15 Palle</h1>
              <p className="text-muted-foreground">Sign in to access your account</p>
            </div>

            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Demo Credentials</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-primary mb-1">Owner Login:</p>
                  <p className="text-muted-foreground">
                    Email: <span className="font-mono bg-background px-2 py-0.5 rounded">owner@15palle.it</span>
                  </p>
                  <p className="text-muted-foreground">
                    Password: <span className="font-mono bg-background px-2 py-0.5 rounded">owner123456</span>
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-primary mb-1">Customer Login (use any of these emails):</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="font-mono text-xs bg-background px-2 py-1 rounded">marco.rossi@example.com</li>
                    <li className="font-mono text-xs bg-background px-2 py-1 rounded">giulia.bianchi@example.com</li>
                    <li className="font-mono text-xs bg-background px-2 py-1 rounded">luca.ferrari@example.com</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Verification code will be displayed on screen
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Choose your account type to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="customer" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="customer">Customer</TabsTrigger>
                    <TabsTrigger value="owner">Owner</TabsTrigger>
                  </TabsList>

                  <TabsContent value="customer" className="space-y-4">
                    {step === "email" ? (
                      <form onSubmit={handleCustomerEmailSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer-email">Email Address</Label>
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
                          <p className="text-xs text-muted-foreground">We'll send you a verification code</p>
                        </div>

                        {error && (
                          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                            <p className="text-sm text-destructive">{error}</p>
                          </div>
                        )}

                        <Button type="submit" className="w-full h-11" disabled={isLoading}>
                          {isLoading ? "Sending..." : "Send Verification Code"}
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={handleCustomerCodeSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="verification-code">Verification Code</Label>
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
                            Code sent to <strong>{customerEmail}</strong>
                          </p>
                        </div>

                        {generatedCode && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <p className="text-sm font-medium text-primary mb-1">Your verification code:</p>
                            <p className="text-2xl font-bold text-center tracking-widest text-primary">
                              {generatedCode}
                            </p>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              (Demo mode - code displayed here)
                            </p>
                          </div>
                        )}

                        {error && (
                          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                            <p className="text-sm text-destructive">{error}</p>
                          </div>
                        )}

                        <Button type="submit" className="w-full h-11" disabled={isLoading}>
                          {isLoading ? "Verifying..." : "Verify & Login"}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={handleBackToEmail}
                          disabled={isLoading}
                        >
                          Use different email
                        </Button>
                      </form>
                    )}
                  </TabsContent>

                  <TabsContent value="owner" className="space-y-4">
                    <form onSubmit={handleOwnerLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="owner-email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="owner-email"
                            type="email"
                            placeholder="owner@15palle.it"
                            value={ownerEmail}
                            onChange={(e) => setOwnerEmail(e.target.value)}
                            required
                            className="h-11 pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="owner-password">Password</Label>
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

                      <Button type="submit" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In as Owner"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/register" className="font-medium text-primary hover:underline">
                      Register here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
