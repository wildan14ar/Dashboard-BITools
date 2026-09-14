import { headers } from "next/headers"
import prisma from "@/config/prisma"
import type { Prisma } from "@/lib/prisma/client"

// ============================================================
// Activity Logging — fire-and-forget, never break main flow
// ============================================================

export async function logActivity(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    const headersList = await headers()
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
        ip: headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? null,
        userAgent: headersList.get("user-agent") ?? null,
      },
    })
  } catch {
    // Never let logging break the main flow
  }
}

// ============================================================
// Notifications
// ============================================================

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  options?: {
    link?: string
    type?: string
  },
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        link: options?.link ?? null,
        type: options?.type ?? "system",
      },
    })
  } catch {
    // Never let notification creation break the main flow
  }
}
