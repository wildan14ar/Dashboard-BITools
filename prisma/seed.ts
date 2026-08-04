import { PrismaClient } from "@/lib/prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient({ accelerateUrl: process.env.DATABASE_URL! })

async function main() {
  const admin = await prisma.user.upsert({
    where: { userName: "admin" },
    update: {},
    create: {
      userName: "admin",
      fullName: "Super Admin",
      email: "admin@bi.com",
      passwordHash: await bcrypt.hash("password123", 10),
      isSuperAdmin: true,
    },
  })

  const perms = [
    { action: "users:view", label: "View Users" },
    { action: "users:create", label: "Create Users" },
    { action: "users:edit", label: "Edit Users" },
    { action: "users:delete", label: "Delete Users" },
    { action: "roles:manage", label: "Manage Roles" },
  ]

  const role = await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: {},
    create: {
      name: "Super Admin",
      description: "Full access",
      isPublic: false,
      permissions: {
        connectOrCreate: perms.map((p) => ({
          where: { action: p.action },
          create: p,
        })),
      },
    },
    include: { users: true },
  })

  const existingLink = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: admin.id, roleId: role.id } },
  })
  if (!existingLink) {
    await prisma.userRole.create({ data: { userId: admin.id, roleId: role.id } })
  }

  console.log("Seeded:", admin.userName, "/ password123  |  Role:", role.name)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
