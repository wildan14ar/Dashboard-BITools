import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

export default NextAuth(authConfig).auth((req) => {
  const { nextUrl } = req
  const { pathname } = nextUrl
  const isLoggedIn = !!req.auth

  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/bi/public") ||
    pathname.startsWith("/bi/embed")

  if (isPublicPath) {
    if (isLoggedIn && pathname === "/login") {
      return Response.redirect(new URL("/", nextUrl))
    }
    return
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}