import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { setCredentialPassword } from "@/lib/password"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

// POST /users/{id}/reset-password — admin setel ulang password user
// (tanpa perlu password lama milik target).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["users:update"] })
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  const requestId = getRequestId(request)

  const validation = await RequestHandler.validateRequest(
    z.object({
      params: z.object({
        id: z.string().min(1),
      }),
      body: z.object({
        newPassword: z.string().min(6, "Password baru minimal 6 karakter").max(128),
      }),
    }),
    request,
    params,
  )
  if (validation instanceof NextResponse) return validation

  try {
    const { id } = validation.params
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true },
    })
    if (!target) {
      return ResponseHandler.notFound("User tidak ditemukan", { requestId })
    }

    await setCredentialPassword(target.id, validation.body.newPassword)
    await logActivity(session.user.id, "UPDATE", "Password", target.id, {
      username: target.username,
      byAdmin: true,
    })

    return ResponseHandler.success(`Password @${target.username} berhasil direset`, null, {
      requestId,
    })
  } catch (err) {
    await logActivity(session.user.id, "ERROR", "Password", validation.params.id, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mereset password", err, { requestId })
  }
}
