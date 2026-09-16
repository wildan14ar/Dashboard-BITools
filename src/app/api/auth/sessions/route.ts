import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

export async function GET(request: NextRequest) {
  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        query: z
          .object({
            isAdmin: z
              .string()
              .optional()
              .transform((val) => val === "true"),
            page: z.string().optional(),
            limit: z.string().optional(),
            search: z.string().optional(),
            sort: z.enum(["createdAt", "expiresAt", "updatedAt"]).optional(),
            order: z.enum(["asc", "desc"]).optional(),
          })
          .optional(),
      }),
      request,
    )
    if (validation instanceof NextResponse) return validation

    const {
      isAdmin,
      page: pageStr,
      limit: limitStr,
      search,
      sort = "createdAt",
      order = "desc",
    } = validation.query ?? {}

    const { error, session } = await requireAuth()
    if (error || !session) {
      return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
    }

    const page = Number(pageStr) || 1
    const limit = Number(limitStr) || 20
    const skip = (page - 1) * limit

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
      const hasAccess = await requireAuth({ permissions: ["sessions:view"] })
      if (hasAccess.error) return hasAccess.error

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

    const currentToken = session.session.token
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

    return ResponseHandler.success("Sessions fetched successfully", {
      items,
      pagination: { page, limit, total },
    })
  } catch (error) {
    await logActivity("system", "ERROR", "Session", undefined, {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal mengambil data session", error)
  }
}
