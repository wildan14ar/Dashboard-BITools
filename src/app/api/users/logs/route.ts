import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { listActivityLogs } from "@/lib/activity"
import { applyFieldsMany, parseFields } from "@/lib/fields"
import { paginateMeta } from "@/lib/pagination"
import { getRequestId } from "@/lib/request-id"
import { parseSort } from "@/lib/sort"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

// GET /users/logs — activity log.
// Biasa: hanya milik sendiri. ?isAdmin=true (+ logs:read): semuanya + filter userId.
export async function GET(request: NextRequest) {
  try {
    const v = await RequestHandler.validateRequest(
      z.object({
        query: z.object({
          isAdmin: z.coerce.boolean().optional(),
          page: z.string().optional(),
          limit: z.string().optional(),
          search: z.string().optional(),
          action: z.string().optional(),
          entity: z.string().optional(),
          userId: z.string().optional(),
          // Sort disanitasi via parseSort() (fallback ke default, tanpa 400).
          sort: z.string().optional(),
          order: z.string().optional(),
          // Postman: field selection — ?fields=action,entity
          fields: z.string().optional(),
        }),
      }),
      request,
    )
    if (v instanceof NextResponse) return v
    const requestId = getRequestId(request)

    const { error, session } = await requireAuth()
    if (error || !session) {
      return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
    }

    const isAdmin = v.query.isAdmin ?? false
    if (isAdmin) {
      const access = await requireAuth({ permissions: ["logs:read"] })
      if (access.error) return access.error
    }

    const allowedFields = [
      "id",
      "action",
      "entity",
      "entityId",
      "metadata",
      "ip",
      "userAgent",
      "createdAt",
      "user",
    ]
    const { fields, unknown } = parseFields(v.query.fields, allowedFields)
    if (v.query.fields && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${allowedFields.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR", requestId },
      )
    }

    const { items, total, page, limit } = await listActivityLogs({
      requesterId: session.user.id,
      isAdmin,
      page: v.query.page,
      limit: v.query.limit,
      search: v.query.search,
      action: v.query.action,
      entity: v.query.entity,
      userId: v.query.userId,
      ...parseSort(v.query, { allowed: ["createdAt", "action", "entity"] }),
    })

    return ResponseHandler.paginated(
      "Logs fetched successfully",
      applyFieldsMany(items as unknown as Record<string, unknown>[], fields),
      paginateMeta(page, limit, total),
      { requestId },
    )
  } catch (e) {
    return ResponseHandler.internalError("Failed to fetch logs", e, {
      requestId: getRequestId(request),
    })
  }
}
