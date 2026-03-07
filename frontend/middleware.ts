import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const canonicalHost = "15palle.com"
const canonicalOrigin = `https://${canonicalHost}`

/**
 * Enforces canonical URL for SEO and Google Search Console:
 * - HTTP → HTTPS (301)
 * - www.15palle.com → 15palle.com (301)
 *
 * Fixes "Pages with Redirects" review failures where Googlebot
 * could not resolve http:// and http://www. to the indexable URL.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const host = url.hostname
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")

  // Only enforce redirects on production domain (leave localhost unchanged)
  const isProductionDomain =
    host === canonicalHost || host === `www.${canonicalHost}`
  if (!isProductionDomain) return NextResponse.next()

  // 1. Redirect HTTP to HTTPS (handles http://15palle.com and http://www.15palle.com)
  if (proto === "http") {
    const httpsUrl = new URL(request.url)
    httpsUrl.protocol = "https:"
    return NextResponse.redirect(httpsUrl, 301)
  }

  // 2. Redirect www to non-www canonical (canonical is https://15palle.com)
  if (host === `www.${canonicalHost}`) {
    const canonicalUrl = new URL(url.pathname + url.search, canonicalOrigin)
    return NextResponse.redirect(canonicalUrl, 301)
  }

  return NextResponse.next()
}

export const config = {
  // Run on all requests so every http/www URL gets a proper 301 redirect
  matcher: ["/((?!_next/static|_next/image).*)"],
}
