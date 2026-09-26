import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { dashboardSchema } from "@/validations"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const { id } = await params
    const dashboard = await prisma.biDashboard.findUnique({
      where: { id },
      include: {
        panels: { orderBy: { createdAt: "asc" } },
        filters: { orderBy: { position: "asc" } },
      },
    })
    if (!dashboard) return ResponseHandler.notFound("Dashboard tidak ditemukan")
    return ResponseHandler.success("Dashboard fetched successfully", dashboard)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDashboard", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengambil dashboard", err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:update"] })
  if (error) return error

  try {
    const { id } = await params
    const validated = await RequestHandler.validateRequest(z.object({ body: dashboardSchema }), req)
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    const dashboard = await prisma.biDashboard.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        tags: data.tags ?? [],
        isPublic: data.isPublic,
      },
    })

    await logActivity(session.user.id, "UPDATE", "BiDashboard", dashboard.id, {
      name: dashboard.name,
    })
    return ResponseHandler.success("Dashboard berhasil diperbarui", dashboard)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDashboard", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal memperbarui dashboard", err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:delete"] })
  if (error) return error

  try {
    const { id } = await params
    await prisma.biDashboard.delete({ where: { id } })

    await logActivity(session.user.id, "DELETE", "BiDashboard", id)
    return ResponseHandler.success("Dashboard berhasil dihapus", { ok: true })
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDashboard", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menghapus dashboard", err)
  }
}
