import { type NextRequest, NextResponse } from "next/server"
import z from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

// DELETE /users/sessions/[id] — cabut satu sesi.
// Milik sendiri (kecuali sesi aktif ini) atau sessions:revoke untuk milik orang lain.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth()
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  const requestId = getRequestId(request)

  const validation = await RequestHandler.validateRequest(
    z.object({
      params: z.object({ id: z.string().min(1) }),
    }),
    request,
    params,
  )
  if (validation instanceof NextResponse) return validation

  // Cek hak revoke-orang-lain dulu agar pesan error tepat.
  const access = await requireAuth({ permissions: ["sessions:revoke"] })
  const canRevokeOthers = !access.error

  try {
    const target = await prisma.session.findUnique({
      where: { id: validation.params.id },
      select: { id: true, token: true, userId: true },
    })
    if (!target) {
      return ResponseHandler.notFound("Session tidak ditemukan", { requestId })
    }

    // Sesi sendiri yang aktif tidak boleh dicabut (gunakan logout).
    if (target.token === (session.session?.token ?? null)) {
      return ResponseHandler.forbidden("Tidak dapat mencabut session ini", { requestId })
    }
    // Sesi orang lain butuh sessions:revoke.
    if (target.userId !== session.user.id && !canRevokeOthers) {
      return ResponseHandler.forbidden("Tidak dapat mencabut session ini", { requestId })
    }

    await prisma.session.delete({ where: { id: target.id } })

    await logActivity(session.user.id, "DELETE", "Session", target.id, {})
    return ResponseHandler.success("Session berhasil dicabut", { id: target.id }, { requestId })
  } catch (err) {
    await logActivity(session.user.id, "ERROR", "Session", validation.params.id, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mencabut session", err, { requestId })
  }
}
