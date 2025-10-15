"use client"

import { RequireRole } from "@/components/require-role"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { me, customers, auth } from "@/lib/mock-api"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, Mail, Phone, Calendar, CheckCircle, Clock, Copy, LogOut, Maximize2, Minimize2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import type { Customer } from "@/lib/mock-api"

function ProfileContent() {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [phone, setPhone] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const user = me.get()
    if (user) {
      const customerData = customers.getById(user.id)
      if (customerData) {
        setCustomer(customerData)
        setPhone(customerData.phone || "")
      }
    }
  }, [])

  const handleSignOut = () => {
    auth.logout()
    router.push("/")
  }

  const handleCopyId = () => {
    if (customer) {
      navigator.clipboard.writeText(customer.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const qrData = customer
    ? JSON.stringify({
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
      })
    : ""

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="mb-2 text-3xl font-bold">My Profile</h1>
                <p className="text-muted-foreground">Manage your account information</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.name}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Customer ID</Label>
                    <div className="flex items-center gap-2">
                      <Input value={customer.id} readOnly />
                      <Button variant="outline" size="icon" onClick={handleCopyId}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {copied && <p className="text-xs text-green-600">Copied to clipboard!</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Verification Status</Label>
                    <div>
                      {customer.verified ? (
                        <div className="space-y-2">
                          <Badge className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                          {customer.verifiedAt && (
                            <p className="text-xs text-muted-foreground">
                              Verified on {new Date(customer.verifiedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending Verification
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            Please show your profile to the club owner for verification
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show to Owner Card */}
              <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Show to Owner</CardTitle>
                      <CardDescription>Present this for in-person verification</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="shrink-0"
                    >
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent
                  className={isFullscreen ? "flex flex-col items-center justify-center h-[calc(100vh-8rem)]" : ""}
                >
                  <div className={`space-y-6 text-center ${isFullscreen ? "scale-150" : ""}`}>
                    <div className="space-y-2">
                      <p className={`font-bold ${isFullscreen ? "text-4xl" : "text-2xl"}`}>{customer.name}</p>
                      <p className={`text-muted-foreground ${isFullscreen ? "text-2xl" : "text-base"}`}>
                        {customer.email}
                      </p>
                      <p className={`font-mono ${isFullscreen ? "text-xl" : "text-sm"} text-muted-foreground`}>
                        ID: {customer.id}
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <div className="rounded-lg border bg-white p-4">
                        <QRCodeSVG value={qrData} size={isFullscreen ? 256 : 200} level="H" />
                      </div>
                    </div>

                    <div>
                      {customer.verified ? (
                        <Badge className="bg-green-600 hover:bg-green-700 text-lg px-4 py-2">
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Verified Member
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-lg px-4 py-2">
                          <Clock className="mr-2 h-5 w-5" />
                          Awaiting Verification
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function CustomerProfilePage() {
  return (
    <RequireRole role="customer">
      <ProfileContent />
    </RequireRole>
  )
}
