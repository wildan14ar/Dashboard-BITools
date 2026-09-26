import { headers } from "next/headers"
import type { Prisma } from "@/config/prisma"
import prisma from "@/config/prisma"
import { parsePagination } from "@/lib/pagination"

// ============================================================
// Activity Logging
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

// ============================================================
// Activity Log Reading (dipakai route GET /users/logs)
// ============================================================

export interface ActivityLogListItem {
  id: string
  action: string
  entity: string
  entityId: string | null
  metadata: unknown
  ip: string | null
  userAgent: string | null
  createdAt: Date
  user: {
    id: string
    username: string
    fullname: string | null
    email: string | null
  } | null
}

/**
 * Logika activity-log terpusat untuk route `/users/logs`.
 * - isAdmin (+ logs:read): semua log, bisa filter userId/action/entity/search.
 * - Biasa: hanya log milik sendiri (userId dipaksa = requester).
 */
export async function listActivityLogs(opts: {
  requesterId: string
  isAdmin: boolean
  page?: unknown
  limit?: unknown
  search?: string
  action?: string
  entity?: string
  userId?: string
  sort?: string
  order?: "asc" | "desc"
}): Promise<{ items: ActivityLogListItem[]; total: number; page: number; limit: number }> {
  const { page, limit, skip } = parsePagination(
    { page: opts.page, limit: opts.limit },
    { limit: 20 },
  )

  const where: Record<string, unknown> = {}
  if (opts.isAdmin) {
    if (opts.action) where.action = opts.action
    if (opts.entity) where.entity = opts.entity
    if (opts.userId) where.userId = opts.userId
  } else {
    // Non-admin: terkunci ke milik sendiri, parameter userId diabaikan.
    where.userId = opts.requesterId
    if (opts.action) where.action = opts.action
    if (opts.entity) where.entity = opts.entity
  }

  if (opts.search) {
    where.OR = [
      { action: { contains: opts.search, mode: "insensitive" } },
      { entity: { contains: opts.search, mode: "insensitive" } },
      { user: { username: { contains: opts.search, mode: "insensitive" } } },
      { user: { fullname: { contains: opts.search, mode: "insensitive" } } },
      { entityId: { contains: opts.search, mode: "insensitive" } },
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { [opts.sort ?? "createdAt"]: opts.order ?? "desc" },
      take: limit,
      skip,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        user: {
          select: { id: true, username: true, fullname: true, email: true },
        },
      },
    }),
    prisma.activityLog.count({ where }),
  ])

  return { items: logs, total, page, limit }
}
