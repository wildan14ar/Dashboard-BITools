import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> },
) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:update"] })
  if (error) return error

  try {
    const { panelId } = await params
    const body = await req.json()

    const panel = await prisma.biPanel.update({
      where: { id: panelId },
      data: {
        title: body.title,
        chartType: body.chartType,
        config: body.config as object | undefined,
        dataSetId: body.dataSetId,
        x: body.x,
        y: body.y,
        w: body.w,
        h: body.h,
      },
    })

    await logActivity(session.user.id, "UPDATE", "BiPanel", panel.id, { title: panel.title })
    return ResponseHandler.success("Panel berhasil diperbarui", panel)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiPanel", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal memperbarui panel", err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> },
) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:update"] })
  if (error) return error

  try {
    const { panelId } = await params
    await prisma.biPanel.delete({ where: { id: panelId } })

    await logActivity(session.user.id, "DELETE", "BiPanel", panelId)
    return ResponseHandler.success("Panel berhasil dihapus", { ok: true })
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiPanel", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menghapus panel", err)
  }
}
