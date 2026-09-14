import { getSessionCookie } from "better-auth/cookies"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * Proxy untuk Next.js 16+ — pola PortoNext (Edge, cek session cookie).
 * Public BI share (/bi/public, /bi/embed) tetap bisa diakses tanpa login.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const sessionCookie = getSessionCookie(request)

  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/bi/public") ||
    pathname.startsWith("/bi/embed")

  if (isPublicPath) {
    if (sessionCookie && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
