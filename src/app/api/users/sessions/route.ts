import { type NextRequest, NextResponse } from "next/server"
import z from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { applyFieldsMany, parseFields } from "@/lib/fields"
import { paginateMeta, parsePagination } from "@/lib/pagination"
import { getRequestId } from "@/lib/request-id"
import { parseSort } from "@/lib/sort"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

const QuerySchema = z.object({
  query: z
    .object({
      isAdmin: z
        .string()
        .optional()
        .transform((val) => val === "true"),
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
      // Sort disanitasi via parseSort() (fallback ke default, tanpa 400).
      sort: z.string().optional(),
      order: z.string().optional(),
      // Postman: field selection — ?fields=isCurrent,expiresAt
      fields: z.string().optional(),
      // DELETE massal milik user tertentu (admin): ?userId=
      userId: z.string().optional(),
      // DELETE massal SEMUA user (admin): ?all=true
      all: z.coerce.boolean().optional(),
    })
    .optional(),
})

export async function GET(request: NextRequest) {
  try {
    const validation = await RequestHandler.validateRequest(QuerySchema, request)
    if (validation instanceof NextResponse) return validation

    const {
      isAdmin,
      page: pageStr,
      limit: limitStr,
      search,
      sort: sortRaw,
      order: orderRaw,
      fields: fieldsRaw,
    } = validation.query ?? {}
    const requestId = getRequestId(request)
    const { sort, order } = parseSort(
      { sort: sortRaw, order: orderRaw },
      { allowed: ["createdAt", "expiresAt", "updatedAt"] },
    )

    const allowedFields = [
      "id",
      "isCurrent",
      "userId",
      "user",
      "expiresAt",
      "createdAt",
      "lastActiveAt",
      "ipAddress",
      "userAgent",
    ]
    const { fields, unknown } = parseFields(fieldsRaw, allowedFields)
    if (fieldsRaw && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${allowedFields.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR", requestId },
      )
    }

    const { error, session } = await requireAuth()
    if (error || !session) {
      return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
    }

    if (isAdmin) {
      const hasAccess = await requireAuth({ permissions: ["sessions:read"] })
      if (hasAccess.error) return hasAccess.error
    }

    const { page, limit, skip } = parsePagination({ page: pageStr, limit: limitStr })
    const currentToken = session.session?.token ?? null

    const where: {
      userId?: string
      user?: {
        OR: Array<
          | { username: { contains: string; mode: "insensitive" } }
          | { fullname: { contains: string; mode: "insensitive" } }
          | { email: { contains: string; mode: "insensitive" } }
        >
      }
    } = {}
    if (isAdmin) {
      if (search) {
        where.user = {
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { fullname: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      }
    } else {
      where.userId = session.user.id
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        orderBy: { [sort]: order },
        take: limit,
        skip,
        select: {
          id: true,
          userId: true,
          // token hanya untuk deteksi isCurrent — tidak dikembalikan
          token: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          ipAddress: true,
          userAgent: true,
          user: { select: { id: true, username: true, fullname: true, email: true } },
        },
      }),
      prisma.session.count({ where }),
    ])

    const items = sessions.map((s) => ({
      id: s.id,
      isCurrent: s.token === currentToken,
      userId: s.userId,
      user: s.user,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      lastActiveAt: s.updatedAt,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
    }))

    return ResponseHandler.paginated(
      "Sessions fetched successfully",
      applyFieldsMany(items, fields),
      paginateMeta(page, limit, total),
      { requestId },
    )
  } catch (error) {
    await logActivity("system", "ERROR", "Session", undefined, {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal mengambil data session", error, {
      requestId: getRequestId(request),
    })
  }
}

// DELETE /users/sessions — cabut SEMUA sesi (massal).
// Tanpa ?userId=: milik sendiri (kecuali sesi aktif ini).
// Dengan ?userId=: butuh sessions:revoke (admin).
export async function DELETE(request: NextRequest) {
  try {
    const validation = await RequestHandler.validateRequest(QuerySchema, request)
    if (validation instanceof NextResponse) return validation
    const requestId = getRequestId(request)

    const { error, session } = await requireAuth()
    if (error || !session) {
      return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
    }

    const targetUserId = validation.query?.userId ?? null
    const allUsers = validation.query?.all ?? false
    if (allUsers || (targetUserId && targetUserId !== session.user.id)) {
      const access = await requireAuth({ permissions: ["sessions:revoke"] })
      if (access.error) return access.error
    }
    const effectiveUserId = targetUserId ?? session.user.id

    // Jangan cabut sesi yang sedang dipakai untuk request ini
    // (API key tidak punya sesi → lewati).
    const currentToken = session.session?.token ?? null
    const current = currentToken
      ? await prisma.session.findFirst({
          where: { token: currentToken },
          select: { id: true },
        })
      : null

    const { count: revoked } = await prisma.session.deleteMany({
      where: {
        ...(allUsers ? {} : { userId: effectiveUserId }),
        ...(current ? { id: { not: current.id } } : {}),
      },
    })

    await logActivity(session.user.id, "DELETE", "Session", allUsers ? "all" : effectiveUserId, {
      bulk: true,
      revoked,
    })

    return ResponseHandler.success(
      `${revoked} session berhasil dicabut`,
      { revoked },
      { requestId },
    )
  } catch (error) {
    await logActivity("system", "ERROR", "Session", undefined, {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal mencabut sessions", error, {
      requestId: getRequestId(request),
    })
  }
}
