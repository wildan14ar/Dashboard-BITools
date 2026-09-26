import type { PrismaClient } from "@/config/prisma"

export const BROADCAST_MAX_TARGETS = 5_000

export interface TargetResolution {
  targets: string[]
  skipped: number
}

/**
 * Resolve target notifikasi ke user aktif (bukan soft-delete).
 * Satu-satunya tempat logika ini — dipakai broadcast & sinkron kalender.
 */
export async function resolveNotificationTargets(
  prisma: PrismaClient,
  opts: { userIds?: string[]; usernames?: string[] },
): Promise<TargetResolution> {
  const userIds = opts.userIds ?? []
  const usernames = opts.usernames ?? []

  if (userIds.length === 0 && usernames.length === 0) {
    const all = await prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
      take: BROADCAST_MAX_TARGETS,
    })
    return { targets: all.map((u) => u.id), skipped: 0 }
  }

  const found = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        ...(userIds.length > 0 ? [{ id: { in: userIds } }] : []),
        ...(usernames.length > 0 ? [{ username: { in: usernames } }] : []),
      ],
    },
    select: { id: true },
  })
  const targets = [...new Set(found.map((u) => u.id))]
  return { targets, skipped: userIds.length + usernames.length - targets.length }
}
