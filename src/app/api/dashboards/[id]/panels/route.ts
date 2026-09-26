import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { panelSchema } from "@/validations"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:update"] })
  if (error) return error

  try {
    const { id: dashboardId } = await params
    const validated = await RequestHandler.validateRequest(z.object({ body: panelSchema }), req)
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    const panel = await prisma.biPanel.create({
      data: {
        ...data,
        dashboardId,
        config: (data.config ?? {}) as object,
      },
    })

    await logActivity(session.user.id, "CREATE", "BiPanel", panel.id, {
      dashboardId,
      title: panel.title,
    })
    return ResponseHandler.created("Panel berhasil dibuat", panel)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiPanel", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal membuat panel", err)
  }
}
