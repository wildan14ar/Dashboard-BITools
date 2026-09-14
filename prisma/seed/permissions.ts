import type { PrismaClient } from "@/lib/prisma/client"

const FEATURE_REGISTRY = [
  {
    group: "BI Management",
    features: [
      {
        key: "dashboards",
        label: "Dashboards",
        description: "BI dashboards management",
        actions: ["read", "create", "update", "delete", "admin"],
      },
      {
        key: "datasets",
        label: "Datasets",
        description: "BI datasets management",
        actions: ["read", "create", "update", "delete", "admin"],
      },
      {
        key: "sources",
        label: "Sources",
        description: "BI data sources management",
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
        actions: ["read", "create", "update", "delete", "admin"],
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
        actions: ["view", "revoke"],
      },
      {
        key: "logs",
        label: "Logs",
        description: "Activity logs management",
        actions: ["view"],
      },
    ],
  },
] as const

export async function seedPermissions(prisma: PrismaClient) {
  console.log("🔄 Seeding Role Permissions...")
  for (const group of FEATURE_REGISTRY) {
    for (const feature of group.features) {
      for (const action of feature.actions) {
        const permissionKey = `${feature.key}:${action}`
        await prisma.rolePermission.upsert({
          where: { action: permissionKey },
          update: {
            label: `${feature.label} - ${action}`,
            description: `Permission to ${action} ${feature.label}`,
          },
          create: {
            action: permissionKey,
            label: `${feature.label} - ${action}`,
            description: `Permission to ${action} ${feature.label}`,
          },
        })
      }
    }
  }
  console.log("✅ Role Permissions seeded")
}
