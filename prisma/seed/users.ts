import { setCredentialPassword } from "@/lib/password"
import type { PrismaClient } from "../../src/config/prisma"

export interface UserCliOverrides {
  email?: string
  username?: string
  fullname?: string
  password?: string
}

// Kredensial awal hardcoded di bawah; override per-seed via flag CLI
// (`--admin-*`/`--user-*`) tanpa mengedit file. Mau ganti permanen?
// Edit DEFAULT_USERS langsung — JANGAN pakai password lemah di production.
export interface SeedUserInput {
  email: string
  fullname: string
  username: string
  password: string
  isSuperAdmin: boolean
  isActive: boolean
  isPublic: boolean
}

export interface UsersSeedOptions {
  admin?: UserCliOverrides
  user?: UserCliOverrides
  skipSystemUser?: boolean
  dryRun?: boolean
}

const DEFAULT_USERS: SeedUserInput[] = [
  {
    email: "admin@example.com",
    fullname: "Super Admin",
    username: "admin",
    password: "admin123",
    isSuperAdmin: true,
    isActive: true,
    isPublic: false,
  },
  {
    email: "user@example.com",
    fullname: "Regular User",
    username: "user",
    password: "user123",
    isSuperAdmin: false,
    isActive: true,
    isPublic: false,
  },
]

function buildOne(base: SeedUserInput, cli?: UserCliOverrides): SeedUserInput {
  const data: SeedUserInput = {
    email: cli?.email?.trim() || base.email,
    fullname: cli?.fullname?.trim() || base.fullname,
    username: cli?.username?.trim() || base.username,
    password: cli?.password?.trim() || base.password,
    isSuperAdmin: base.isSuperAdmin,
    isActive: true,
    isPublic: false,
  }
  if (data.password.length < 6) {
    throw new Error(`Password untuk ${data.username} minimal 6 karakter`)
  }
  return data
}

export function buildUsersData(opts: Pick<UsersSeedOptions, "admin" | "user"> = {}): {
  users: SeedUserInput[]
} {
  const [adminBase, userBase] = DEFAULT_USERS
  return { users: [buildOne(adminBase, opts.admin), buildOne(userBase, opts.user)] }
}

// User sistem untuk aktivitas yang berjalan atas nama sistem (bukan user login).
// ActivityLog.userId berupa FK ke User, jadi user sistem wajib ada agar log
// system valid (tidak gagal FOREIGN KEY) dan tampil di panel admin.
export const SYSTEM_USER = {
  id: "system",
  email: "system@portonext.local",
  fullname: "System",
  username: "system",
  isSuperAdmin: false,
  isActive: false,
  isPublic: false,
}

export async function seedUsers(prisma: PrismaClient, opts: UsersSeedOptions = {}) {
  console.log("🔄 Seeding Users...")
  const { users } = buildUsersData(opts)

  if (opts.dryRun) {
    for (const u of users) console.log(`🔍 [dry-run] User: ${u.email} (${u.username})`)
    if (!opts.skipSystemUser) console.log(`🔍 [dry-run] User: ${SYSTEM_USER.email} (system)`)
    return
  }

  if (!opts.skipSystemUser) {
    const systemExists = await prisma.user.findUnique({ where: { id: SYSTEM_USER.id } })
    if (systemExists) {
      await prisma.user.update({
        where: { id: SYSTEM_USER.id },
        data: {
          email: SYSTEM_USER.email,
          fullname: SYSTEM_USER.fullname,
          username: SYSTEM_USER.username,
          isSuperAdmin: SYSTEM_USER.isSuperAdmin,
          isActive: SYSTEM_USER.isActive,
          isPublic: SYSTEM_USER.isPublic,
        },
      })
      console.log("✅ System user updated:", SYSTEM_USER.email)
    } else {
      await prisma.user.create({
        data: {
          id: SYSTEM_USER.id,
          email: SYSTEM_USER.email,
          fullname: SYSTEM_USER.fullname,
          username: SYSTEM_USER.username,
          isSuperAdmin: SYSTEM_USER.isSuperAdmin,
          isActive: SYSTEM_USER.isActive,
          isPublic: SYSTEM_USER.isPublic,
        },
      })
      console.log("✅ System user seeded:", SYSTEM_USER.email)
    }
  }

  for (const userData of users) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: userData.email }, { username: userData.username }],
      },
    })

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            email: userData.email,
            fullname: userData.fullname,
            username: userData.username,
            isSuperAdmin: userData.isSuperAdmin,
            isActive: userData.isActive,
            isPublic: userData.isPublic,
          },
        })
      : await prisma.user.create({
          data: {
            email: userData.email,
            fullname: userData.fullname,
            username: userData.username,
            isSuperAdmin: userData.isSuperAdmin,
            isActive: userData.isActive,
            isPublic: userData.isPublic,
          },
        })

    await setCredentialPassword(user.id, userData.password)

    console.log("✅ User seeded:", user.email)
  }
}
