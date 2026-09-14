import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { setCredentialPassword } from "@/lib/credentials"
import { dataUrlByteLength, MAX_AVATAR_SIZE } from "@/lib/image-upload"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { UserFilterSchema, UserSchema } from "@/validations"

export async function GET(request: NextRequest) {
  try {
    const validation = await RequestHandler.validateRequest(
      z.object({ query: UserFilterSchema }),
      request,
    )
    if (validation instanceof NextResponse) return validation

    const { page: pageStr, limit: limitStr, search, sort, order } = validation.query
    const page = Number(pageStr) || 1
    const limit = Number(limitStr) || 10
    const skip = (page - 1) * limit

    const { error, session } = await requireAuth({ permissions: ["users:admin"] })
    if (error) return error

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { username: { contains: search, mode: "insensitive" as const } },
            { fullname: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sort]: order },
        select: {
          id: true,
          email: true,
          username: true,
          fullname: true,
          avatar: true,
          isActive: true,
          isPublic: true,
          isSuperAdmin: true,
          createdAt: true,
          updatedAt: true,
          userRoles: { select: { role: { select: { id: true, name: true } } } },
        },
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ])

    return ResponseHandler.success("Users fetched successfully", {
      items: users,
      pagination: { page, limit, total },
    })
  } catch (error) {
    await logActivity("system", "ERROR", "User", "unknown", { error: String(error) })
    return ResponseHandler.internalError("Gagal mengambil data user", error)
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["users:create"] })
  if (error) return error

  try {
    const validations = await RequestHandler.validateRequest(
      z.object({ body: UserSchema }),
      request,
    )
    if (validations instanceof NextResponse) return validations

    const {
      email,
      password,
      fullname,
      username,
      avatar,
      quote,
      isActive,
      isSuperAdmin,
      isPublic,
      roleIds,
    } = validations.body
    if (avatar && dataUrlByteLength(avatar) > MAX_AVATAR_SIZE) {
      return ResponseHandler.badRequest("Ukuran foto profil maksimal 2 MB")
    }
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } })
    if (existingUser) {
      return ResponseHandler.badRequest("Email atau username sudah digunakan")
    }

    const user = await prisma.user.create({
      data: {
        email,
        fullname,
        username,
        avatar,
        quote,
        isPublic,
        isActive,
        isSuperAdmin,
        userRoles: roleIds
          ? { create: roleIds.map((roleId: string) => ({ role: { connect: { id: roleId } } })) }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        username: true,
        isActive: true,
        isSuperAdmin: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await setCredentialPassword(user.id, password)

    await logActivity(session?.user?.id || "system", "CREATE", "User", user.id, {
      email: user.email,
    })
    return ResponseHandler.created("User berhasil dibuat", user)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "User", "unknown", {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal membuat user", err)
  }
}
