import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { getRequestId } from "@/lib/request-id"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error
    const requestId = getRequestId(request)

    const { count } = await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    })

    return ResponseHandler.success(
      "All notifications marked as read",
      { updated: count },
      {
        requestId,
      },
    )
  } catch (err) {
    return ResponseHandler.internalError("Failed to mark all notifications as read", err, {
      requestId: getRequestId(request),
    })
  }
}
