import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const canonicalHost = "15palle.com"
const canonicalOrigin = `https://${canonicalHost}`

const KIOSK_COOKIE = "kiosk_access"
const KIOSK_PATHS = ["/kiosk", "/counter"] as const

function isKioskPath(pathname: string): boolean {
  return KIOSK_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}

async function kioskCookieProof(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${secret}|15palle-kiosk-v1`)
  const buf = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function forbidden(): NextResponse {
  return new NextResponse("Accesso al terminale kiosk non autorizzato.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}

/**
 * When KIOSK_ACCESS_SECRET is set, /kiosk and /counter require either:
 * - HttpOnly cookie (set once via ?token=SECRET or Authorization: Bearer SECRET), or
 * - Authorization: Bearer SECRET on each request.
 *
 * If the env var is unset, kiosk routes stay public (local dev / legacy).
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const host = url.hostname
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")

  const isProductionDomain = host === canonicalHost || host === `www.${canonicalHost}`

  // --- Canonical URL first (so kiosk cookie is always set on https://15palle.com, not www) ---
  if (isProductionDomain) {
    if (proto === "http") {
      const httpsUrl = new URL(request.url)
      httpsUrl.protocol = "https:"
      return NextResponse.redirect(httpsUrl, 301)
    }

    if (host === `www.${canonicalHost}`) {
      const canonicalUrl = new URL(url.pathname + url.search, canonicalOrigin)
      return NextResponse.redirect(canonicalUrl, 301)
    }
  }

  const secret = process.env.KIOSK_ACCESS_SECRET?.trim()
  if (secret && isKioskPath(url.pathname)) {
    const proof = await kioskCookieProof(secret)
    const cookieVal = request.cookies.get(KIOSK_COOKIE)?.value ?? ""
    const hasCookie = cookieVal.length > 0 && timingSafeEqual(cookieVal, proof)

    const authHeader = request.headers.get("authorization")
    const bearer =
      authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : ""
    const hasBearer = bearer.length > 0 && timingSafeEqual(bearer, secret)

    const tokenParam = url.searchParams.get("token")?.trim() ?? ""
    const hasToken = tokenParam.length > 0 && timingSafeEqual(tokenParam, secret)

    if (hasCookie || hasBearer) {
      return NextResponse.next()
    }

    if (hasToken) {
      const clean = new URL(request.url)
      clean.searchParams.delete("token")
      const res = NextResponse.redirect(clean)
      const secure = proto === "https"
      res.cookies.set(KIOSK_COOKIE, proof, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      })
      return res
    }

    return forbidden()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
