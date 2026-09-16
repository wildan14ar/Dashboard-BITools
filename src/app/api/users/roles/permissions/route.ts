import prisma from "@/config/prisma"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function GET() {
  const { error } = await requireAuth({
    permissions: ["permissions:read"],
  })
  if (error) return error

  try {
    const permissions = await prisma.rolePermission.findMany({
      orderBy: [{ action: "asc" }, { label: "asc" }],
    })

    // Group permissions by feature (first part before ":")
    const groupedPermissions = permissions.reduce(
      (acc, permission) => {
        const key = permission.action.split(":")[0] || "other"
        const featureName = key.charAt(0).toUpperCase() + key.slice(1)
        if (!acc[featureName]) {
          acc[featureName] = []
        }
        acc[featureName].push(permission)
        return acc
      },
      {} as Record<string, typeof permissions>,
    )

    return ResponseHandler.success("Permissions fetched successfully", groupedPermissions)
  } catch (error) {
    console.error("Error fetching permissions:", error)
    return ResponseHandler.internalError("Gagal mengambil data permissions", error)
  }
}
