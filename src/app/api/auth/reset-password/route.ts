import { headers } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logActivity } from "@/lib/activity"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { auth } from "@/middlewares/auth"

// POST /auth/reset-password — ganti password sendiri (wajib password lama).
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  const requestId = getRequestId(request)

  const validation = await RequestHandler.validateRequest(
    z.object({
      body: z.object({
        currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
        newPassword: z.string().min(8, "Password baru minimal 8 karakter").max(128),
      }),
    }),
    request,
  )
  if (validation instanceof NextResponse) return validation

  try {
    let changed: unknown
    try {
      changed = await auth.api.changePassword({
        body: {
          currentPassword: validation.body.currentPassword,
          newPassword: validation.body.newPassword,
          revokeOtherSessions: true,
        },
        headers: await headers(),
      })
    } catch (err) {
      // Better Auth melempar APIError bila password lama salah.
      const apiErr = err as { status?: unknown; statusCode?: unknown; body?: { code?: string } }
      const wrongPassword =
        apiErr?.statusCode === 400 ||
        apiErr?.statusCode === 401 ||
        apiErr?.status === "BAD_REQUEST" ||
        apiErr?.status === "UNAUTHORIZED" ||
        apiErr?.body?.code === "INVALID_PASSWORD"
      if (wrongPassword) {
        return ResponseHandler.badRequest("Password saat ini salah", {
          field: "currentPassword",
        })
      }
      throw err
    }
    if (!changed) {
      return ResponseHandler.badRequest("Password saat ini salah", { field: "currentPassword" })
    }

    await logActivity(session.user.id, "UPDATE", "Password", session.user.id, {})
    return ResponseHandler.success("Password berhasil diubah", null, { requestId })
  } catch (err) {
    await logActivity(session.user.id, "ERROR", "Password", session.user.id, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengubah password", err, { requestId })
  }
}
