"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { me } from "@/lib/mock-api"
import type { UserRole } from "@/lib/mock-api"

interface RequireRoleProps {
  role: UserRole
  children: React.ReactNode
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const user = me.get()

    if (!user) {
      router.push("/login")
      return
    }

    if (user.role !== role) {
      router.push("/")
      return
    }

    setIsAuthorized(true)
  }, [role, router])

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
