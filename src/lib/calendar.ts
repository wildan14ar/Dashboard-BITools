import type { PrismaClient } from "@/config/prisma"

export function parseNotes(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function stringifyNotes(value: unknown): string {
  return JSON.stringify(Array.isArray(value) ? value.map(String) : [])
}

/** Field yang boleh diminta via ?fields= pada GET calendar. */
export const EVENT_FIELDS = [
  "id",
  "title",
  "description",
  "createdById",
  "startDate",
  "endDate",
  "allDay",
  "color",
  "isNotify",
  "isHoliday",
  "repeatType",
  "repeatDays",
  "notes",
  "userIds",
  "occurrences",
  "createdAt",
  "updatedAt",
] as const

export interface SerializableEvent {
  id: string
  title: string
  description: string | null
  createdById: string | null
  startDate: Date
  endDate: Date | null
  allDay: boolean
  color: string
  isNotify: boolean
  isHoliday: boolean
  repeatType: string
  repeatDays: string
  notes: string
  createdAt: Date
  updatedAt: Date
  assignments: { userId: string }[]
}

export function serializeEvent(obj: SerializableEvent) {
  return {
    id: obj.id,
    title: obj.title,
    description: obj.description,
    createdById: obj.createdById,
    startDate: obj.startDate,
    endDate: obj.endDate,
    allDay: obj.allDay,
    color: obj.color,
    isNotify: obj.isNotify,
    isHoliday: obj.isHoliday,
    repeatType: obj.repeatType,
    repeatDays: obj.repeatDays,
    notes: parseNotes(obj.notes),
    userIds: obj.assignments.map((a) => a.userId),
    occurrences: [],
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

/** Baca: superadmin, publik (createdById null), pembuat, atau yang di-assign. */
export function canReadEvent(
  event: { createdById: string | null; assignments: { userId: string }[] },
  userId: string,
  isSuperAdmin = false,
): boolean {
  if (isSuperAdmin) return true
  return (
    event.createdById === null ||
    event.createdById === userId ||
    event.assignments.some((a) => a.userId === userId)
  )
}

/** Tulis: hanya pembuat atau superadmin (event sistem = superadmin saja). */
export function canWriteEvent(
  event: { createdById: string | null },
  userId: string,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true
  return event.createdById !== null && event.createdById === userId
}

/**
 * Sinkron notifikasi pengingat otomatis untuk event (via FK calendarId).
 * - enabled=true: hapus auto-notif lama lalu buat baru untuk tiap assignee.
 * - enabled=false: hapus auto-notif (tidak ada notifikasi).
 * Idempoten: aman dipanggil berulang dari PUT. Hapus event meng-cascade
 * otomatis di DB, jadi route DELETE tak perlu memanggil ini.
 */
export async function syncEventNotifications(
  prisma: PrismaClient,
  event: { id: string; title: string; startDate: Date; description: string | null },
  userIds: string[],
  enabled: boolean,
): Promise<void> {
  const where = { calendarId: event.id, type: "calendar" }
  await prisma.notification.deleteMany({ where }).catch(() => {})
  if (!enabled || userIds.length === 0) return

  const when = event.startDate.toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  const body = `Pengingat: ${event.title} — ${when}${event.description ? `\n${event.description}` : ""}`
  await prisma.notification
    .createMany({
      data: [...new Set(userIds)].map((userId) => ({
        userId,
        title: `Pengingat: ${event.title}`,
        body,
        link: "/calendar",
        type: "calendar",
        calendarId: event.id,
      })),
    })
    .catch(() => {})
}

/**
 * Validasi userIds assignee: harus user aktif & ada.
 * Kembalikan { valid } atau { valid: null, unknown } untuk respons 422.
 */
export async function resolveAssignees(
  prisma: PrismaClient,
  userIds: string[],
): Promise<{ valid: string[] } | { valid: null; unknown: string[] }> {
  const unique = [...new Set(userIds)]
  if (unique.length === 0) return { valid: [] }
  const found = await prisma.user.findMany({
    where: { id: { in: unique }, isActive: true, deletedAt: null },
    select: { id: true },
  })
  const foundSet = new Set(found.map((u) => u.id))
  const unknown = unique.filter((id) => !foundSet.has(id))
  if (unknown.length > 0) return { valid: null, unknown }
  return { valid: unique }
}
