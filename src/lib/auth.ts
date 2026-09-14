import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { username } from "better-auth/plugins"
import { ulid } from "ulid"
import prisma from "@/config/prisma"
import { settings } from "@/config/settings"
import { createNotification, logActivity } from "@/lib/activity"
import { hashPassword, verifyPassword } from "@/lib/hash"

export const auth = betterAuth({
  appName: "BI Dashboard",
  secret: settings.BETTER_AUTH_SECRET,
  baseURL: settings.BETTER_AUTH_URL,
  trustedOrigins: [settings.BETTER_AUTH_URL, ...settings.betterAuth.trustedOrigins],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    password: {
      hash: (password) => hashPassword(password),
      verify: ({ hash, password }) => verifyPassword(password, hash),
    },
  },
  accountLinking: {
    allowDifferentEmails: false,
  },
  user: {
    modelName: "User",
    fields: {
      name: "fullname",
      image: "avatar",
      emailVerified: "isEmailVerified",
    },
  },
  session: {
    modelName: "Session",
    expiresIn: 60 * 60 * 24 * 30,
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  advanced: {
    database: {
      generateId: () => ulid(),
    },
  },
  plugins: [
    username({
      displayUsername: false,
    }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await logActivity(user.id, "CREATE", "User", user.id, { email: user.email })
          createNotification(user.id, "Selamat Datang!", `Akun ${user.name} berhasil dibuat`, {
            link: "/",
            type: "system",
          }).catch(() => {})
        },
      },
    },
  },
})
