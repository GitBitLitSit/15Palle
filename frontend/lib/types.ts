export interface Member {
  _id: string
  firstName: string
  lastName: string
  email: string
  createdAt: string // ISO Date string
  blocked: boolean
  qrUuid: string
  emailValid: boolean
  /** True when email send failed (invalid address). Do not send again. */
  emailInvalid?: boolean
}

export interface CheckInEvent {
  type: "NEW_CHECKIN"
  member: Member | null
  warning?: string | null // e.g., "Passback Warning"
  warningCode?: "INVALID_QR" | "MEMBER_BLOCKED" | "SCANNED_TOO_OFTEN" | null
  warningParams?: Record<string, unknown>
  timestamp?: string
  checkInTime?: string
}

export interface KioskCheckInEvent {
  type: "NEW_CHECKIN"
  hasMember: boolean
  /** Full name for kiosk display when a member is associated with the event */
  memberName?: string | null
  warning?: string | null
  warningCode?: "INVALID_QR" | "MEMBER_BLOCKED" | "SCANNED_TOO_OFTEN" | null
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
