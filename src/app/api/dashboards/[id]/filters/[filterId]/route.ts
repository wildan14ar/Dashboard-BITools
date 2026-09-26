import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; filterId: string }> },
) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:update"] })
  if (error) return error

  try {
    const { filterId } = await params
    const body = await req.json()
    const filter = await prisma.biFilter.update({
      where: { id: filterId },
      data: {
        name: body.name,
        label: body.label,
        type: body.type,
        config: (body.config ?? {}) as object,
        position: body.position,
      },
    })

    await logActivity(session.user.id, "UPDATE", "BiFilter", filter.id, { name: filter.name })
    return ResponseHandler.success("Filter berhasil diperbarui", filter)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiFilter", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal memperbarui filter", err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; filterId: string }> },
) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:update"] })
  if (error) return error

  try {
    const { filterId } = await params
    await prisma.biFilter.delete({ where: { id: filterId } })

    await logActivity(session.user.id, "DELETE", "BiFilter", filterId)
    return ResponseHandler.success("Filter berhasil dihapus", { ok: true })
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiFilter", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menghapus filter", err)
  }
}
