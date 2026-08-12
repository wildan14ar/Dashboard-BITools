import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.isSuperAdmin = user.isSuperAdmin as boolean
      return token
    },
    session({ session, token }) {
      session.user.isSuperAdmin = token.isSuperAdmin as boolean
      return session
    },
  },
} satisfies NextAuthConfig