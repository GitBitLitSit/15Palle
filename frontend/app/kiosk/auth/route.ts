import { createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const KIOSK_COOKIE = "kiosk_access"

function cookieProof(secret: string): string {
  return createHash("sha256").update(`${secret}|15palle-kiosk-v1`).digest("hex")
}

function equalSafe(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function GET(req: NextRequest) {
  const secret = process.env.KIOSK_ACCESS_SECRET?.trim()
  if (!secret) {
    return new NextResponse("Kiosk access non configurato correttamente.", { status: 503 })
  }

  const tokenRaw = req.nextUrl.searchParams.get("token")?.trim() ?? ""
  const token = tokenRaw.replace(/ /g, "+")

  if (!token || !equalSafe(token, secret)) {
    return new NextResponse("Accesso al terminale kiosk non autorizzato.", { status: 403 })
  }

  const out = NextResponse.redirect(new URL("/kiosk", req.url))
  const isHttps = req.nextUrl.protocol === "https:"
  out.cookies.set(KIOSK_COOKIE, cookieProof(secret), {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  return out
}
