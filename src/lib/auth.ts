import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { loginSchema } from "@/validation/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        userName: {},
        password: {},
      },
      authorize: async (credentials) => {
        const { userName, password } = loginSchema.parse(credentials)
        const user = await prisma.user.findUnique({ where: { userName } })
        if (!user) return null
        const match = await bcrypt.compare(password, user.passwordHash)
        if (!match) return null
        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          image: null,
          isSuperAdmin: user.isSuperAdmin,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
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
})
