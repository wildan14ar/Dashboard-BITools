import type { PrismaClient } from "../../src/config/prisma"

const FEATURE_REGISTRY = [
  {
    group: "File Storage",
    features: [
      {
        key: "attachments",
        label: "Attachments",
        description: "File attachments management",
        actions: ["read", "create", "update", "delete", "admin"],
      },
    ],
  },
  {
    group: "User Management",
    features: [
      {
        key: "users",
        label: "Users",
        description: "Users management",
        actions: ["create", "update", "delete", "admin"],
      },
      {
        key: "roles",
        label: "Roles",
        description: "Roles management",
        actions: ["read", "create", "update", "delete"],
      },
      {
        key: "permissions",
        label: "Permissions",
        description: "Permissions management",
        actions: ["read"],
      },
      {
        key: "sessions",
        label: "Sessions",
        description: "Sessions management",
        actions: ["read", "revoke"],
      },
      {
        key: "logs",
        label: "Logs",
        description: "Activity logs management",
        actions: ["read"],
      },
      {
        key: "notifications",
        label: "Notifications",
        description: "Broadcast notifications to users",
        actions: ["broadcast"],
      },
      {
        key: "keys",
        label: "API Keys",
        description: "API keys management",
        actions: ["read", "create", "update", "delete"],
      },
    ],
  },
] as const

export async function seedPermissions(prisma: PrismaClient, opts: { dryRun?: boolean } = {}) {
  console.log("🔄 Seeding Role Permissions...")
  if (opts.dryRun) {
    console.log("🔍 [dry-run] Permissions: akan sinkron katalog + hapus legacy")
    return
  }
  const seen = new Set<string>()
  for (const group of FEATURE_REGISTRY) {
    for (const feature of group.features) {
      for (const action of feature.actions) {
        const permissionKey = `${feature.key}:${action}`
        seen.add(permissionKey)
        // Katalog = baris roleId null (tanpa unique global → findFirst).
        const existing = await prisma.rolePermission.findFirst({
          where: { action: permissionKey, roleId: null },
          select: { id: true },
        })
        if (existing) {
          await prisma.rolePermission.update({
            where: { id: existing.id },
            data: {
              label: `${feature.label} - ${action}`,
              description: `Permission to ${action} ${feature.label}`,
            },
          })
        } else {
          await prisma.rolePermission.create({
            data: {
              action: permissionKey,
              label: `${feature.label} - ${action}`,
              description: `Permission to ${action} ${feature.label}`,
              roleId: null,
            },
          })
        }
      }
    }
  }
  // Hapus permission legacy hasil rename (view→read, edit→update), model yang
  // sudah dihapus (platform/social), dan yang tak pernah dicek kode agar
  // katalog hanya berisi nama yang aktif.
  const legacy = [
    "sessions:view",
    "logs:view",
    "platform:admin",
    "platform:read",
    "platform:update",
    "social:create",
    "social:update",
    "social:delete",
    "roles:admin",
    "users:read",
  ]
  const stale = legacy.filter((a) => !seen.has(a))
  if (stale.length > 0) {
    const { count } = await prisma.rolePermission.deleteMany({
      where: { action: { in: stale } },
    })
    if (count > 0) console.log(`🧹 Removed legacy permissions: ${stale.join(", ")}`)
  }
  console.log("✅ Role Permissions seeded")
}
