import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { idempotencyScope, rememberIdempotent, tryReplayIdempotent } from "@/lib/idempotency"
import { BROADCAST_MAX_TARGETS, resolveNotificationTargets } from "@/lib/notifications"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

const INSERT_CHUNK = 500

const BroadcastSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Judul wajib diisi").max(200),
    body: z.string().max(2_000).optional(),
    link: z.string().max(500).optional(),
    type: z.string().max(50).optional().default("broadcast"),
    // Target: salah satu — userIds, usernames, atau kosong = semua user aktif.
    userIds: z.array(z.string()).max(BROADCAST_MAX_TARGETS).optional(),
    usernames: z.array(z.string()).max(BROADCAST_MAX_TARGETS).optional(),
    // Opsional: kaitkan ke event calendar (ikut terhapus bila event dihapus).
    calendarId: z.string().optional(),
  }),
})

// POST /notifications/broadcast — kirim notifikasi ke banyak user sekaligus.
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["notifications:broadcast"] })
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }

  const scope = idempotencyScope(session.user.id)
  const replay = await tryReplayIdempotent(request, scope)
  if (replay) return replay
  const requestId = getRequestId(request)

  const validation = await RequestHandler.validateRequest(BroadcastSchema, request)
  if (validation instanceof NextResponse) return validation

  try {
    const { title, body, link, type, userIds, usernames, calendarId } = validation.body

    // Event harus ada bila broadcast dikaitkan ke calendar.
    if (calendarId) {
      const event = await prisma.calendar.findUnique({
        where: { id: calendarId },
        select: { id: true },
      })
      if (!event) {
        return ResponseHandler.notFound("Calendar event tidak ditemukan", { requestId })
      }
    }

    const { targets, skipped } = await resolveNotificationTargets(prisma, {
      userIds,
      usernames,
    })
    if (targets.length === 0) {
      return ResponseHandler.unprocessable("Tidak ada user aktif yang cocok", {
        requested: (userIds?.length ?? 0) + (usernames?.length ?? 0),
        field: "userIds",
      })
    }

    const now = new Date()
    for (let i = 0; i < targets.length; i += INSERT_CHUNK) {
      const chunk = targets.slice(i, i + INSERT_CHUNK)
      await prisma.notification.createMany({
        data: chunk.map((userId) => ({
          userId,
          title,
          body: body ?? null,
          link: link ?? null,
          type,
          calendarId: calendarId ?? null,
          createdAt: now,
        })),
      })
    }

    await logActivity(session.user.id, "CREATE", "NotificationBroadcast", undefined, {
      title,
      sent: targets.length,
      calendarId: calendarId ?? null,
    })

    return rememberIdempotent(
      request,
      scope,
      ResponseHandler.created(
        `Broadcast terkirim ke ${targets.length} user`,
        {
          sent: targets.length,
          skipped,
        },
        { requestId },
      ),
    )
  } catch (err) {
    await logActivity(session.user.id, "ERROR", "NotificationBroadcast", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengirim broadcast", err, { requestId })
  }
}
