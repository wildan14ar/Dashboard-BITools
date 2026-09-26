import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { dashboardSchema } from "@/validations"

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const dashboards = await prisma.biDashboard.findMany({
      include: { _count: { select: { panels: true } } },
      orderBy: { createdAt: "desc" },
    })
    return ResponseHandler.success("Dashboards fetched successfully", dashboards)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDashboard", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengambil dashboards", err)
  }
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:create"] })
  if (error) return error

  try {
    const validated = await RequestHandler.validateRequest(z.object({ body: dashboardSchema }), req)
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    const dashboard = await prisma.biDashboard.create({
      data: {
        name: data.name,
        description: data.description,
        tags: data.tags ?? [],
        isPublic: data.isPublic ?? false,
        userId: session.user.id,
      },
    })

    await logActivity(session.user.id, "CREATE", "BiDashboard", dashboard.id, {
      name: dashboard.name,
    })
    return ResponseHandler.created("Dashboard berhasil dibuat", dashboard)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDashboard", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal membuat dashboard", err)
  }
}
