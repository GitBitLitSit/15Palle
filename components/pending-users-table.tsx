"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Mail, Phone, MapPin, Calendar, CheckCircle, Clock } from "lucide-react"
import type { User } from "@/lib/types"
import { useRouter } from "next/navigation"

interface PendingUsersTableProps {
  users: User[]
}

export function PendingUsersTable({ users }: PendingUsersTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [verifyingUsers, setVerifyingUsers] = useState<Set<string>>(new Set())

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone.toLowerCase().includes(searchLower) ||
      user.city.toLowerCase().includes(searchLower) ||
      user.country.toLowerCase().includes(searchLower)
    )
  })

  const handleVerify = async (userId: string) => {
    setVerifyingUsers((prev) => new Set(prev).add(userId))

    try {
      const response = await fetch("/api/verify-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error("Failed to verify user")
      }

      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error("Error verifying user:", error)
      alert("Failed to verify user. Please try again.")
    } finally {
      setVerifyingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unverified Users ({filteredUsers.length})</CardTitle>
        <CardDescription>Users waiting for admin approval to access the club</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, phone, city, or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No pending verifications</p>
            <p className="text-sm text-muted-foreground">All users have been verified or no users match your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-lg border border-secondary/30 bg-secondary/5 p-4 transition-colors hover:bg-secondary/10"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {user.first_name} {user.last_name}
                        </h3>
                        <Badge variant="secondary" className="mt-1">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending Verification
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{user.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {user.city}, {user.country}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Born: {new Date(user.date_of_birth).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <p>
                        Address: {user.address}, {user.zip} {user.city}, {user.cp}
                      </p>
                      <p className="mt-1">Registered: {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:flex-col">
                    <Button
                      onClick={() => handleVerify(user.id)}
                      disabled={verifyingUsers.has(user.id)}
                      className="w-full lg:w-auto"
                    >
                      {verifyingUsers.has(user.id) ? (
                        "Verifying..."
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Verify User
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
