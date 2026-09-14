import { setCredentialPassword } from "@/lib/credentials"
import type { PrismaClient } from "@/lib/prisma/client"

function env(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback
}

// Kredensial awal diambil dari env (SEED_*) agar tiap deploy
// bisa punya akun sendiri tanpa mengedit kode. Jangan pakai default di production.
export const usersData = [
  {
    email: env("SEED_ADMIN_EMAIL", "admin@bi.com"),
    fullname: env("SEED_ADMIN_NAME", "Super Admin"),
    username: env("SEED_ADMIN_USERNAME", "admin"),
    password: env("SEED_ADMIN_PASSWORD", "password123"),
    isSuperAdmin: true,
    isActive: true,
    isPublic: false,
  },
  {
    email: env("SEED_USER_EMAIL", "user@bi.com"),
    fullname: env("SEED_USER_NAME", "Regular User"),
    username: env("SEED_USER_USERNAME", "user"),
    password: env("SEED_USER_PASSWORD", "user123"),
    isSuperAdmin: false,
    isActive: true,
    isPublic: false,
  },
]

// User sistem untuk aktivitas yang berjalan atas nama sistem (bukan user login).
export const SYSTEM_USER = {
  id: "system",
  email: "system@bi.local",
  fullname: "System",
  username: "system",
  isSuperAdmin: false,
  isActive: false,
  isPublic: false,
}

export async function seedUsers(prisma: PrismaClient) {
  console.log("🔄 Seeding Users...")

  if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_USER_PASSWORD) {
    console.warn(
      "⚠️  Using default seed passwords — set SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD in .env",
    )
  }

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

  for (const userData of usersData) {
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
