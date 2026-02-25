/**
 * Client-side auth state derived from localStorage token.
 * Used by RequireRole to gate owner-only pages. Token presence means owner.
 */

export type UserRole = "owner" | "customer"

export interface AuthUser {
  role: UserRole
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

/**
 * Returns current user if authenticated. Owner role when JWT token is present.
 * Customer role is inferred from sessionStorage currentMember (e.g. on /customer/profile).
 */
export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const token = getToken()
  if (token) return { role: "owner" }
  const member = sessionStorage.getItem("currentMember")
  if (member) return { role: "customer" }
  return null
}

/** Singleton-like getter for RequireRole compatibility */
export const me = {
  get: getCurrentUser,
}
