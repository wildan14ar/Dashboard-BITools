import { headers } from "next/headers"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { auth } from "@/lib/auth"
import { dataUrlByteLength, MAX_AVATAR_SIZE } from "@/lib/image-upload"
import { ResponseHandler, requireAuth } from "@/middlewares"
import { fetchAndCachePermissions } from "@/middlewares/rbac"

const UpdateProfileSchema = z.object({
  fullname: z.string().min(1, "Nama tidak boleh kosong").max(100).optional(),
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Username hanya boleh huruf kecil, angka, dan underscore")
    .optional(),
  quote: z.string().max(200).optional().nullable(),
  avatar: z.string().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password minimal 8 karakter").optional(),
})

export async function GET() {
  try {
    const { error, session } = await requireAuth()
    if (error || !session) {
      return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
    }

    const [user, permission] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          username: true,
          email: true,
          fullname: true,
          quote: true,
          avatar: true,
        },
      }),
      fetchAndCachePermissions(session.user.id),
    ])
    if (!user) return ResponseHandler.notFound("User tidak ditemukan")

    return ResponseHandler.success("User data fetched successfully", {
      user,
      roles: permission?.roles ?? [],
      isSuperAdmin: permission?.isSuperAdmin ?? false,
      permissions: permission?.permissions ?? [],
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

    if (data.avatar && dataUrlByteLength(data.avatar) > MAX_AVATAR_SIZE) {
      return ResponseHandler.badRequest("Ukuran foto profil maksimal 2 MB")
    }

    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: { username: data.username, NOT: { id: session.user.id } },
      })
      if (existing) {
        return ResponseHandler.conflict("Username sudah digunakan")
      }
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        return ResponseHandler.badRequest("Password saat ini diperlukan untuk mengganti password")
      }

      const result = await auth.api.changePassword({
        body: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          revokeOtherSessions: true,
        },
        headers: await headers(),
      })
      if (!result) {
        return ResponseHandler.badRequest("Password saat ini salah")
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.fullname !== undefined && { fullname: data.fullname }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.quote !== undefined && { quote: data.quote }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
      select: {
        username: true,
        email: true,
        fullname: true,
        quote: true,
        avatar: true,
      },
    })

    await logActivity(session.user.id, "UPDATE", "Profile", session.user.id)

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
