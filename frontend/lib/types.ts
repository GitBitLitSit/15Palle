export interface Member {
  _id: string
  firstName: string
  lastName: string
  email: string
  createdAt: string // ISO Date string
  blocked: boolean
  qrUuid: string
  emailValid: boolean
}

export interface CheckInEvent {
  type: "NEW_CHECKIN"
  member: Member | null
  warning?: string | null // e.g., "Passback Warning"
  warningCode?: "INVALID_QR" | "MEMBER_BLOCKED" | null
  warningParams?: Record<string, unknown>
  timestamp?: string
  checkInTime?: string
}

export interface DashboardStats {
  total: number
  blocked: number
}

export interface AuthUser {
  id: string
  email: string
  role: "customer" | "owner"
  name: string
}
