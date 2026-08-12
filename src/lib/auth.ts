import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { loginSchema } from "@/validation/auth"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
})