import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { filterSchema } from "@/validations"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:update"] })
  if (error) return error

  try {
    const { id: dashboardId } = await params
    const validated = await RequestHandler.validateRequest(z.object({ body: filterSchema }), req)
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    const filter = await prisma.biFilter.create({
      data: { ...data, dashboardId, config: (data.config ?? {}) as object },
    })

    await logActivity(session.user.id, "CREATE", "BiFilter", filter.id, {
      dashboardId,
      name: filter.name,
    })
    return ResponseHandler.created("Filter berhasil dibuat", filter)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiFilter", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal membuat filter", err)
  }
}
