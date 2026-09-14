import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:admin"] })
  if (error) return error

  try {
    const { id: dashboardId } = await params
    const { userId, role } = await req.json()
    if (!userId) return ResponseHandler.badRequest("userId wajib diisi")

    const member = await prisma.biDashboardMember.create({
      data: { dashboardId, userId, role: role ?? "VIEWER" },
      include: { user: { select: { id: true, username: true, email: true } } },
    })

    await logActivity(session.user.id, "CREATE", "BiDashboardMember", member.id, {
      dashboardId,
      userId,
    })
    return ResponseHandler.created("Member berhasil ditambahkan", member)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDashboardMember", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menambahkan member", err)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["dashboards:admin"] })
  if (error) return error

  try {
    const { id: dashboardId } = await params
    const { userId } = await req.json()
    if (!userId) return ResponseHandler.badRequest("userId wajib diisi")

    await prisma.biDashboardMember.deleteMany({
      where: { dashboardId, userId },
    })

    await logActivity(session.user.id, "DELETE", "BiDashboardMember", undefined, {
      dashboardId,
      userId,
    })
    return ResponseHandler.success("Member berhasil dihapus", { ok: true })
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDashboardMember", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menghapus member", err)
  }
}
