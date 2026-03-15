import i18n, { getApiLanguage } from "@/lib/i18n"

const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  console.error("API URL is missing! Check your .env or SST output.")
}

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return {
    "Content-Type": "application/json",
    "Accept-Language": getApiLanguage(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getAuthHeadersWithoutContentType() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return {
    "Accept-Language": getApiLanguage(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function loginAdmin(credentials: { username: string; password: string }) {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": getApiLanguage() },
    body: JSON.stringify(credentials),
  })
  return handleResponse(res)
}

export async function createMember(data: { firstName: string; lastName: string; email: string; sendEmail?: boolean }) {
  const res = await fetch(`${API_URL}/members`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function exportMembersCsv(): Promise<Blob> {
  const res = await fetch(`${API_URL}/members/export`, {
    method: "GET",
    headers: getAuthHeadersWithoutContentType(),
  })
  if (!res.ok) {
    await handleResponse(res)
  }
  return res.blob()
}

export async function importMembersCsv(csvText: string) {
  const res = await fetch(`${API_URL}/members/import`, {
    method: "POST",
    headers: {
      ...getAuthHeadersWithoutContentType(),
      "Content-Type": "text/csv",
    },
    body: csvText,
  })
  return handleResponse(res)
}

export async function importMembersBatch(
  members: Array<{
    firstName: string
    lastName: string
    email: string
    blocked?: boolean
    emailValid?: boolean
    createdAt?: string
  }>,
) {
  const res = await fetch(`${API_URL}/members/import/batch`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ members }),
  })
  return handleResponse(res)
}

export async function checkExistingUsers(emails: string[]) {
  const res = await fetch(`${API_URL}/check-existing-users`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ emails }),
  })
  return handleResponse(res)
}

export async function bulkCreateUsers(
  users: Array<{
    firstName: string
    lastName: string
    email: string
    sendEmail?: boolean
  }>,
) {
  const res = await fetch(`${API_URL}/bulk-create-users`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ users }),
  })
  return handleResponse(res)
}

export async function deleteMember(memberId: string) {
  const res = await fetch(`${API_URL}/members/${memberId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  return handleResponse(res)
}

export type MemberStatusFilter = "all" | "active" | "blocked" | "pending" | "invalid"

export async function getMembers(
  page = 1,
  search = "",
  status: MemberStatusFilter = "all",
  limit = "20"
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit,
    status,
    ...(search && { search }),
  })

  const res = await fetch(`${API_URL}/members?${params}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  return handleResponse(res)
}

export async function resetQrCode(memberId: string) {
  const res = await fetch(`${API_URL}/members/reset-qrcode`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ id: memberId }),
  })
  return handleResponse(res)
}

export async function requestVerificationCode(email: string) {
  const res = await fetch(`${API_URL}/auth/request-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": getApiLanguage() },
    body: JSON.stringify({ email }),
  })
  return handleResponse(res)
}

export async function verifyAndRecover(data: {
  email: string
  verificationCode: string
  deliveryMethod: "email" | "display"
}) {
  const res = await fetch(`${API_URL}/members/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": getApiLanguage() },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function getCheckIns(
  page = 1,
  limit = 50,
  status?: "all" | "success" | "failure"
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status && status !== "all") params.set("status", status)
  const res = await fetch(`${API_URL}/auth/check-ins?${params.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse(res)
}

export async function updateMember(
  id: string,
  data: {
    firstName: string
    lastName: string
    email: string
    blocked: boolean
    sendEmail?: boolean
    emailValid?: boolean
    emailInvalid?: boolean
  },
) {
  const res = await fetch(`${API_URL}/members/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

async function handleResponse(res: Response) {
  type ErrorData = {
    messageText?: string
    message?: string
    error?: unknown
    params?: Record<string, unknown>
  }

  if (!res.ok) {
    const errorData: ErrorData = await res.json().catch(() => ({}))
    const localized =
      errorData.messageText ||
      errorData.message ||
      (errorData.error ? i18n.t(`errors.${String(errorData.error)}`, errorData.params || {}) : null)
    const err = new Error(localized || errorData.error || `HTTP Error: ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }

  return res.json()
}
