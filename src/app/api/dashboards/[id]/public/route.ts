import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:admin"] })
  if (error) return error

  try {
    const { id } = await params
    const body = await req.json()
    const dashboard = await prisma.biDashboard.update({
      where: { id },
      data: { isPublic: body.isPublic },
    })

    await logActivity(session.user.id, "UPDATE", "BiDashboard", dashboard.id, {
      isPublic: dashboard.isPublic,
    })
    return ResponseHandler.success("Visibilitas dashboard berhasil diperbarui", dashboard)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDashboard", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal memperbarui visibilitas dashboard", err)
  }
}
