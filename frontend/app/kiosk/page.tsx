import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createHash, timingSafeEqual } from "node:crypto"
import KioskClient from "./kiosk-client"

const KIOSK_COOKIE = "kiosk_access"

function cookieProof(secret: string): string {
  return createHash("sha256").update(`${secret}|15palle-kiosk-v1`).digest("hex")
}

function tokenHash(token: string): string {
  return createHash("sha256").update(`${token}|15palle-kiosk-v1`).digest("hex")
}

function resolveExpectedHash(): string {
  const hash = process.env.NEXT_PUBLIC_KIOSK_ACCESS_HASH?.trim()
  if (hash) return hash

  // Fallbacks for environments where non-public vars are not consistently available at runtime.
  const rawSecret = process.env.KIOSK_ACCESS_SECRET?.trim() || process.env.NEXT_PUBLIC_KIOSK_ACCESS_SECRET?.trim()
  return rawSecret ? tokenHash(rawSecret) : ""
}

function equalSafe(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function readToken(searchParams: Record<string, string | string[] | undefined>): string {
  const raw = searchParams.token
  const first = Array.isArray(raw) ? raw[0] : raw
  const token = (first ?? "").trim()
  return token.replace(/ /g, "+")
}

export default async function KioskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const expectedHash = resolveExpectedHash()
  if (!expectedHash) {
    return (
      <main className="min-h-screen grid place-items-center p-6 text-center">
        <p className="text-lg font-semibold text-destructive">Kiosk access non configurato correttamente.</p>
      </main>
    )
  }

  const params = await searchParams
  const token = readToken(params)
  const proof = cookieProof(expectedHash)
  const cookieVal = (await cookies()).get(KIOSK_COOKIE)?.value ?? ""
  const hasCookie = cookieVal.length > 0 && equalSafe(cookieVal, proof)

  if (!hasCookie && token) {
    redirect(`/kiosk/auth?token=${encodeURIComponent(token)}`)
  }

  if (!hasCookie) {
    return (
      <main className="min-h-screen grid place-items-center p-6 text-center">
        <p className="text-lg font-semibold text-destructive">Accesso al terminale kiosk non autorizzato.</p>
      </main>
    )
  }

  return <KioskClient />
}
