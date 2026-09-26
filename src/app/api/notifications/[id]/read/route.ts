import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { getRequestId } from "@/lib/request-id"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error
    const requestId = getRequestId(request)

    const { id } = await params

    const notif = await prisma.notification.findUnique({ where: { id } })
    if (!notif) return ResponseHandler.notFound("Notification not found", { requestId })
    if (notif.userId !== session.user.id)
      return ResponseHandler.forbidden("Bukan notifikasi Anda", { requestId })

    if (!notif.isRead) {
      await prisma.notification.update({ where: { id }, data: { isRead: true } })
    }

    return ResponseHandler.success(
      "Notification marked as read",
      { id, isRead: true },
      {
        requestId,
      },
    )
  } catch (err) {
    return ResponseHandler.internalError("Failed to mark notification as read", err, {
      requestId: getRequestId(request),
    })
  }
}
