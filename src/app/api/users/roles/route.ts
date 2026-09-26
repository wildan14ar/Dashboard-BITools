import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { applyFieldsMany, parseFields } from "@/lib/fields"
import { idempotencyScope, rememberIdempotent, tryReplayIdempotent } from "@/lib/idempotency"
import { paginateMeta, parsePagination } from "@/lib/pagination"
import { getRequestId } from "@/lib/request-id"
import { parseSort } from "@/lib/sort"
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
          // Sort disanitasi via parseSort() (fallback ke default, tanpa 400).
          sort: z.string().optional(),
          order: z.string().optional(),
          // Postman: field selection — ?fields=name,permissions
          fields: z.string().optional(),
        }),
      }),
      request,
    )
    if (validation instanceof NextResponse) return validation
    const requestId = getRequestId(request)

    const { page, limit, skip } = parsePagination({
      page: validation.query.page,
      limit: validation.query.limit,
    })
    const take = limit
    const { sort, order } = parseSort(validation.query, { allowed: ["createdAt", "name"] })

    const allowedFields = ["id", "name", "description", "permissions", "createdAt", "updatedAt"]
    const { fields, unknown } = parseFields(validation.query.fields, allowedFields)
    if (validation.query.fields && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${allowedFields.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR", requestId },
      )
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        take,
        skip,
        include: {
          permissions: true, // Grant langsung (FK roleId), bukan join table
        },
        orderBy: { [sort]: order },
      }),
      prisma.role.count(),
    ])

    // Transform ke array action untuk kompatibilitas frontend
    const rolesFormatted = roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((p) => p.action),
    }))

    return ResponseHandler.paginated(
      "Roles fetched successfully",
      applyFieldsMany(rolesFormatted, fields),
      paginateMeta(page, limit, total),
      { requestId },
    )
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

  const replay = await tryReplayIdempotent(request, idempotencyScope(session?.user?.id))
  if (replay) return replay

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
      return ResponseHandler.conflict("Nama role sudah digunakan", { field: "name" })
    }

    // Map permission strings (actions) → salinan baris milik role ini.
    // Katalog (roleId null) hanya referensi label/deskripsi, tidak di-assign.
    let grantCreates: { action: string; label: string; description: string | null }[] = []
    if (permissions && permissions.length > 0) {
      // Find permissions that exist by action
      const catalog = await prisma.rolePermission.findMany({
        where: { action: { in: permissions }, roleId: null },
        select: { action: true, label: true, description: true },
      })

      grantCreates = catalog.map((p) => ({
        action: p.action,
        label: p.label,
        description: p.description,
      }))
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: grantCreates.length > 0 ? { create: grantCreates } : undefined,
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
    return rememberIdempotent(
      request,
      idempotencyScope(session?.user?.id),
      ResponseHandler.created("Role berhasil dibuat", roleFormatted),
    )
  } catch (error) {
    await logActivity(userId, "ERROR", "Role", "create", {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal membuat role", error)
  }
}
