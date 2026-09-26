import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { customSession, username } from "better-auth/plugins"
import { ulid } from "ulid"
import prisma from "@/config/prisma"
import { settings } from "@/config/settings"
import { createNotification, logActivity } from "@/lib/activity"
import { hashPassword, verifyPassword } from "@/lib/password"

export const auth = betterAuth({
  appName: "PortoNext",
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
    // ponytail: argon2 override agar hash konsisten dengan src/lib/password.ts
    password: {
      hash: (password) => hashPassword(password),
      verify: ({ hash, password }) => verifyPassword(password, hash),
    },
  },
  socialProviders: {
    ...(settings.oauth.google.enabled &&
    settings.oauth.google.clientId &&
    settings.oauth.google.clientSecret
      ? {
          google: {
            clientId: settings.oauth.google.clientId,
            clientSecret: settings.oauth.google.clientSecret,
          },
        }
      : {}),
    ...(settings.oauth.github.enabled &&
    settings.oauth.github.clientId &&
    settings.oauth.github.clientSecret
      ? {
          github: {
            clientId: settings.oauth.github.clientId,
            clientSecret: settings.oauth.github.clientSecret,
          },
        }
      : {}),
  },
  accountLinking: {
    // Email OAuth harus cocok dengan user existing (perilaku lama)
    allowDifferentEmails: false,
  },
  user: {
    // WAJIB lowercase: schema-check Better Auth membandingkan modelName
    // verbatim dengan introspeksi DMMF yang di-lowercase-kan.
    modelName: "user",
    fields: {
      name: "fullname",
      image: "avatar",
      emailVerified: "isEmailVerified",
    },
  },
  session: {
    modelName: "session",
    expiresIn: 60 * 60 * 24 * 30,
  },
  account: {
    modelName: "account",
  },
  verification: {
    modelName: "verification",
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
    // Roles/permissions/isSuperAdmin hidup di payload SESSION (bukan /auth/me),
    // sehingga frontend gate UI tanpa endpoint profil membocorkannya.
    // CATATAN: plugin custom-session MENGGANTI total respons /get-session
    // dengan return fn ini — jadi bentuk penuh { user, session, ... } wajib
    // di-spread balik, bukan hanya field tambahan.
    // Query inline (bukan fetchAndCachePermissions) untuk hindari import cycle auth↔rbac.
    customSession(async (full) => {
      const fallback = { ...full, roles: [], permissions: [], isSuperAdmin: false }
      try {
        const record = await prisma.user.findUnique({
          where: { id: full.user.id },
          select: {
            isActive: true,
            deletedAt: true,
            isSuperAdmin: true,
            userRoles: {
              select: {
                role: {
                  select: {
                    name: true,
                    permissions: { select: { action: true } },
                  },
                },
              },
            },
          },
        })
        if (!record?.isActive || record?.deletedAt) {
          return fallback
        }
        const permissions = Array.from(
          new Set(record.userRoles.flatMap((ur) => ur.role.permissions.map((p) => p.action))),
        )
        return {
          ...full,
          roles: record.userRoles.map((ur) => ur.role.name),
          permissions,
          isSuperAdmin: record.isSuperAdmin,
        }
      } catch {
        return fallback
      }
    }),
    // Wajib PALING AKHIR di Next.js: plugin dengan hooks.after (seperti
    // customSession di atas) bisa set cookie yang gagal diteruskan jika
    // nextCookies tidak di ujung. Lihat warning Better Auth.
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
