import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { applyFieldsMany, parseFields } from "@/lib/fields"
import { paginateMeta, parsePagination } from "@/lib/pagination"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const v = await RequestHandler.validateRequest(
      z.object({
        query: z.object({
          page: z.string().optional(),
          limit: z.string().optional(),
          filter: z.enum(["unread"]).optional(),
          // Postman: cursor pagination untuk feed high-write —
          // ?cursor=<id_terakhir>&limit=20. Stabil walau ada data baru.
          cursor: z.string().optional(),
          // Postman: field selection — ?fields=title,isRead
          fields: z.string().optional(),
        }),
      }),
      request,
    )
    if (v instanceof NextResponse) return v

    const { page, limit, skip } = parsePagination(
      { page: v.query.page, limit: v.query.limit },
      { limit: 20 },
    )
    const requestId = getRequestId(request)

    const allowedFields = [
      "id",
      "title",
      "body",
      "link",
      "isRead",
      "type",
      "calendarId",
      "createdAt",
    ]
    const { fields, unknown } = parseFields(v.query.fields, allowedFields)
    if (v.query.fields && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${allowedFields.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR", requestId },
      )
    }

    const baseWhere: Record<string, unknown> = { userId: session.user.id }
    if (v.query.filter === "unread") baseWhere.isRead = false

    // Mode cursor: untuk feed yang sering berubah (stabil terhadap insert baru).
    if (v.query.cursor) {
      const cursorWhere: Record<string, unknown> = {
        ...baseWhere,
        id: { lt: v.query.cursor },
      }
      const rows = await prisma.notification.findMany({
        where: cursorWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      })
      const has_more = rows.length > limit
      const cursorItems = applyFieldsMany(rows.slice(0, limit), fields)
      const unreadCount = await prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      })
      return ResponseHandler.success(
        "Notifications fetched",
        {
          items: cursorItems,
          pagination: {
            next_cursor: has_more ? rows[limit - 1].id : null,
            has_more,
          },
          unreadCount,
        },
        { requestId },
      )
    }

    const where: Record<string, unknown> = baseWhere

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ])

    return ResponseHandler.success(
      "Notifications fetched",
      {
        items: applyFieldsMany(items, fields),
        pagination: paginateMeta(page, limit, total),
        unreadCount,
      },
      { requestId },
    )
  } catch (err) {
    return ResponseHandler.internalError("Failed to fetch notifications", err, {
      requestId: getRequestId(request),
    })
  }
}
