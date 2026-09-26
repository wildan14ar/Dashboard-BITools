import { z } from "zod"
import prisma from "@/config/prisma"
import { deleteAttachmentByUrl, toAttachmentUrl } from "@/config/storage"
import { logActivity } from "@/lib/activity"
import { ResponseHandler, requireAuth } from "@/middlewares"
import { GenderSchema, NullableAttachmentUrlSchema } from "@/validations"

const UpdateProfileSchema = z.object({
  fullname: z.string().min(1, "Nama tidak boleh kosong").max(100).optional(),
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Username hanya boleh huruf kecil, angka, dan underscore")
    .optional(),
  quote: z.string().max(200).optional().nullable(),
  // Referensi attachment — upload via POST /api/attachments.
  avatar: NullableAttachmentUrlSchema,
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  birthDate: z.coerce.date().optional().nullable(),
  birthPlace: z.string().max(100).optional().nullable(),
  gender: GenderSchema.optional().nullable(),
})

export async function GET() {
  try {
    const { error, session } = await requireAuth()
    if (error || !session) {
      return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
    }

    // Profil + ringkasan untuk header: 5 notifikasi terbaru (+unreadCount)
    // dan 5 aktivitas terakhir milik sendiri (deep-link ke tab profil).
    const [user, notifItems, unreadCount, recentLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          username: true,
          email: true,
          fullname: true,
          quote: true,
          avatar: true,
          phone: true,
          address: true,
          birthDate: true,
          birthPlace: true,
          gender: true,
        },
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          body: true,
          link: true,
          isRead: true,
          type: true,
          calendarId: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
      prisma.activityLog.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, action: true, entity: true, createdAt: true },
      }),
    ])
    if (!user) return ResponseHandler.notFound("User tidak ditemukan")

    return ResponseHandler.success("User data fetched successfully", {
      user: { ...user, avatar: toAttachmentUrl(user.avatar) },
      notifications: { items: notifItems, unreadCount },
      recentLogs,
    })
  } catch (error) {
    await logActivity("system", "ERROR", "User", undefined, {
      error: String(error),
    })
    return ResponseHandler.internalError("Failed to fetch user data", error)
  }
}

export async function PUT(request: Request) {
  let session: { user: { id: string } } | null = null
  try {
    const result = await requireAuth()
    session = result.session
    if (result.error || !session) {
      return result.error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return ResponseHandler.badRequest("Invalid JSON body")
    }

    const parsed = UpdateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return ResponseHandler.badRequest("Validasi gagal", parsed.error.flatten().fieldErrors)
    }

    const data = parsed.data

    const previous = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    })

    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: { username: data.username, NOT: { id: session.user.id } },
      })
      if (existing) {
        return ResponseHandler.conflict("Username sudah digunakan")
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.fullname !== undefined && { fullname: data.fullname }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.quote !== undefined && { quote: data.quote }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.birthDate !== undefined && { birthDate: data.birthDate }),
        ...(data.birthPlace !== undefined && { birthPlace: data.birthPlace }),
        ...(data.gender !== undefined && { gender: data.gender }),
      },
      select: {
        username: true,
        email: true,
        fullname: true,
        quote: true,
        avatar: true,
        phone: true,
        address: true,
        birthDate: true,
        birthPlace: true,
        gender: true,
      },
    })

    await logActivity(session.user.id, "UPDATE", "Profile", session.user.id)

    if (data.avatar !== undefined && previous?.avatar && previous.avatar !== data.avatar) {
      void deleteAttachmentByUrl(previous.avatar)
    }

    return ResponseHandler.success("Profil berhasil diperbarui", user)
  } catch (error) {
    await logActivity(
      session?.user?.id || "system",
      "ERROR",
      "Profile",
      session?.user?.id ?? undefined,
      { error: String(error) },
    )
    return ResponseHandler.internalError("Gagal memperbarui profil", error)
  }
}
