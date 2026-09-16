import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth({ permissions: ["logs:view"] })
    if (error) return error

    const v = await RequestHandler.validateRequest(
      z.object({
        query: z.object({
          page: z.string().optional(),
          limit: z.string().optional(),
          search: z.string().optional(),
          action: z.string().optional(),
          entity: z.string().optional(),
          userId: z.string().optional(),
          sort: z.enum(["createdAt", "action", "entity"]).optional(),
          order: z.enum(["asc", "desc"]).optional(),
        }),
      }),
      request,
    )
    if (v instanceof NextResponse) return v

    const {
      page: pageStr = "1",
      limit: limitStr = "20",
      search,
      action,
      entity,
      userId,
      sort = "createdAt",
      order = "desc",
    } = v.query
    const page = Number(pageStr) || 1
    const limit = Number(limitStr) || 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (entity) where.entity = entity
    if (userId) where.userId = userId
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { user: { username: { contains: search, mode: "insensitive" } } },
        { user: { fullname: { contains: search, mode: "insensitive" } } },
        { entityId: { contains: search, mode: "insensitive" } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { [sort]: order },
        take: limit,
        skip,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          metadata: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: { id: true, username: true, fullname: true, email: true },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ])

    return ResponseHandler.success("OK", {
      items: logs,
      pagination: { page, limit, total },
    })
  } catch (e) {
    return ResponseHandler.internalError("Failed", e)
  }
}
