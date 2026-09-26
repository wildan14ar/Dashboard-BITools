import { getSessionCookie } from "better-auth/cookies"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { ulid } from "ulid"
import { routing } from "@/i18n/routing"
import { checkRateLimit } from "@/middlewares/rate-limit"

/**
 * Proxy untuk Next.js 16+
 *
 * Fungsi:
 * - API (`/api/*`): suntik `x-request-id`, rate-limit + header
 *   `X-RateLimit-*`.
 * - Halaman: TANPA landing publik. `/` → redirect `/dashboard`.
 *   Guard auth untuk `/dashboard/*`, redirect user login dari
 *   `/login|/register`. Locale tetap dideteksi (cookie → Accept-Language
 *   → default) dan disuntik via header `x-locale` untuk next-intl.
 * - Runs on Edge Runtime untuk low latency
 */

// Routes tanpa prefix locale yang boleh diakses langsung (aset dinamis)
const PUBLIC_ROUTES = new Set(["/opengraph-image"])

// Konfigurasi fitur yang bisa di-enable/disable via env
const FEATURES = {
  // Flag toggle register dari environment variable (default: true jika tidak diset / "true")
  REGISTER_ENABLED: process.env.NEXT_PUBLIC_ALLOW_REGISTER !== "false",
}

// Rate limit API: default 120 req/menit per IP (override via env)
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 120) || 120
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000) || 60_000

/** Penanganan khusus API: observability + proteksi abuse. */
function handleApi(request: NextRequest): NextResponse {
  const requestId = request.headers.get("x-request-id") ?? ulid()

  // Rate limit per IP (auth & publik berbagi budget bertahap ini)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  const rl = checkRateLimit(`api:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)

  if (!rl.allowed) {
    return NextResponse.json(
      {
        success: false,
        message: "Terlalu banyak permintaan. Coba lagi nanti.",
        data: null,
        code: "TOO_MANY_REQUESTS",
        requestId,
      },
      {
        status: 429,
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.reset),
          "Retry-After": String(rl.retryAfter),
        },
      },
    )
  }

  // Teruskan request-id ke route handler
  const reqHeaders = new Headers(request.headers)
  reqHeaders.set("x-request-id", requestId)

  const res = NextResponse.next({ request: { headers: reqHeaders } })
  res.headers.set("X-Request-ID", requestId)
  res.headers.set("X-RateLimit-Limit", String(rl.limit))
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining))
  res.headers.set("X-RateLimit-Reset", String(rl.reset))

  return res
}

function detectLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("locale")?.value
  if (cookieLocale && (routing.locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale
  }

  const acceptLanguage = request.headers.get("accept-language") || ""
  for (const lang of acceptLanguage.split(",")) {
    const code = lang.split(";")[0].trim().toLowerCase().split("-")[0]
    if ((routing.locales as readonly string[]).includes(code)) {
      return code
    }
  }

  return routing.defaultLocale
}

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // API diperlakukan terpisah: tanpa locale-redirect/auth-page redirect
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return handleApi(request)
  }

  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next()
  }

  const locale = detectLocale(request)
  const sessionCookie = getSessionCookie(request)
  const reqHeaders = new Headers(request.headers)
  reqHeaders.set("x-locale", locale)

  // Root kini milik dashboard: "/" → "/dashboard" (search dipertahankan).
  if (pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = search
    return NextResponse.redirect(url)
  }

  // Halaman TANPA prefix locale: /dashboard/* (guard auth), /login|/register
  // (redirect user login + toggle register). x-locale tetap disuntik.
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/")
  ) {
    const isAuthPage =
      pathname === "/login" ||
      pathname.startsWith("/login/") ||
      pathname === "/register" ||
      pathname.startsWith("/register/")

    if (isAuthPage && sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      if (!sessionCookie) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("callbackUrl", pathname + search)
        return NextResponse.redirect(loginUrl)
      }
    }

    if (!FEATURES.REGISTER_ENABLED) {
      if (pathname === "/register" || pathname.startsWith("/register/")) {
        const redirectUrl = new URL(
          "/login?message=Registration+is+currently+disabled",
          request.url,
        )
        return NextResponse.redirect(redirectUrl)
      }
    }

    return NextResponse.next({ request: { headers: reqHeaders } })
  }

  // Sisa path (termasuk legacy /id/*, /en/*, /about, /contact, /privacy,
  // /terms) tidak lagi ada: arahkan ke /dashboard agar bookmark lama tetap jalan.
  // Pengecualian auth: user belum login yang membuka halaman tak dikenal
  // diarahkan ke /login agar tidak memantul dashboard→login dua kali.
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  const url = request.nextUrl.clone()
  url.pathname = "/dashboard"
  url.search = search
  return NextResponse.redirect(url)
}

// Matcher: sertakan API (request-id/rate-limit) + halaman,
// lewati aset Next dan file statis (ada ekstensi).
export const config = {
  matcher: ["/api/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
}
