"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Mail, Phone, MapPin, Calendar, CheckCircle, Clock } from "lucide-react"
import type { User } from "@/lib/types"

interface UsersTableProps {
  users: User[]
  showVerificationStatus?: boolean
}

export function UsersTable({ users, showVerificationStatus = false }: UsersTableProps) {
  const [searchTerm, setSearchTerm] = useState("")

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {showVerificationStatus ? "Registered Members" : "Users"} ({filteredUsers.length})
        </CardTitle>
        <CardDescription>
          {showVerificationStatus
            ? "All registered users with their verification status"
            : "Search and view user information"}
        </CardDescription>
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
            <p className="text-muted-foreground">No users found matching your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/50">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {user.first_name} {user.last_name}
                        </h3>
                        {showVerificationStatus && (
                          <Badge variant={user.is_verified ? "default" : "secondary"} className="mt-1">
                            {user.is_verified ? (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Verified
                              </>
                            ) : (
                              <>
                                <Clock className="mr-1 h-3 w-3" />
                                Pending
                              </>
                            )}
                          </Badge>
                        )}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
