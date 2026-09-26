import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { panelReorderSchema } from "@/validations"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:update"] })
  if (error) return error

  try {
    const { id: dashboardId } = await params
    const validated = await RequestHandler.validateRequest(
      z.object({ body: panelReorderSchema }),
      req,
    )
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    await prisma.$transaction(
      data.map((p) =>
        prisma.biPanel.update({ where: { id: p.id }, data: { x: p.x, y: p.y, w: p.w, h: p.h } }),
      ),
    )

    await logActivity(session.user.id, "UPDATE", "BiPanel", undefined, {
      dashboardId,
      action: "reorder",
      count: data.length,
    })
    return ResponseHandler.success("Panel berhasil diurutkan ulang", { ok: true })
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiPanel", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengurutkan ulang panel", err)
  }
}
