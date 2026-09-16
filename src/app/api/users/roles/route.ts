import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { RoleSchema } from "@/validations"

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth({
    permissions: ["roles:read"],
  })
  if (error) return error
  const userId = session?.user?.id

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        query: z.object({
          page: z.string().optional(),
          limit: z.string().optional(),
          search: z.string().optional(),
          sort: z.enum(["createdAt", "name"]).default("createdAt"),
          order: z.enum(["asc", "desc"]).default("desc"),
        }),
      }),
      request,
    )
    if (validation instanceof NextResponse) return validation

    const { page: pageStr, limit: limitStr } = validation.query
    const page = Number(pageStr) || 1
    const limit = Number(limitStr) || 10
    const skip = (page - 1) * limit
    const take = limit
    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        take,
        skip,
        include: {
          permissions: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.role.count(),
    ])

    // Transform permissions relation to strings (actions) for frontend compatibility
    const rolesFormatted = roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((p) => p.action),
    }))

    return ResponseHandler.success("Roles fetched successfully", {
      items: rolesFormatted,
      pagination: {
        page,
        limit,
        total,
      },
    })
  } catch (error) {
    await logActivity(userId, "ERROR", "Role", "list", {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal mengambil data role", error)
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth({
    permissions: ["roles:create"],
  })
  if (error) return error
  const userId = session?.user?.id

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        body: RoleSchema,
      }),
      request,
    )
    if (validation instanceof NextResponse) return validation

    const { name, description, permissions } = validation.body

    const existingRole = await prisma.role.findUnique({
      where: { name },
    })

    if (existingRole) {
      return ResponseHandler.badRequest("Nama role sudah digunakan")
    }

    // Map permission strings (actions) to connections
    let permissionConnections = {}
    if (permissions && permissions.length > 0) {
      // Find permissions that exist by action
      const existingPermissions = await prisma.rolePermission.findMany({
        where: { action: { in: permissions } },
        select: { id: true, action: true },
      })

      if (existingPermissions.length > 0) {
        permissionConnections = {
          connect: existingPermissions.map((p) => ({ id: p.id })),
        }
      }
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissionConnections,
      },
      include: {
        permissions: true,
      },
    })

    const roleFormatted = {
      ...role,
      permissions: role.permissions.map((p) => p.action),
    }

    await logActivity(userId, "CREATE", "Role", role.id, { name })
    return ResponseHandler.created("Role berhasil dibuat", roleFormatted)
  } catch (error) {
    await logActivity(userId, "ERROR", "Role", "create", {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal membuat role", error)
  }
}
