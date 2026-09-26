import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { deleteAttachmentByUrl, toAttachmentUrl } from "@/config/storage"
import { logActivity } from "@/lib/activity"
import { applyFields, parseFields } from "@/lib/fields"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { PartialUpdateUserSchema, UpdateUserSchema } from "@/validations"

const paramsSchema = z.object({
  id: z.string().min(1),
})

// GET /users/{id} — detail user by id.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let identifier = ""
  let userId: string | null = null
  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        params: paramsSchema,
        query: z.object({
          isAdmin: z.coerce.boolean().optional(),
          // Postman: field selection — ?fields=fullname,avatar
          fields: z.string().optional(),
        }),
      }),
      request,
      params,
    )
    if (validation instanceof NextResponse) return validation

    if (validation.query.isAdmin) {
      const { error: authError, session: authSession } = await requireAuth({
        permissions: ["users:admin"],
      })
      if (authError) return authError
      userId = authSession?.user?.id ?? null
    }
    identifier = validation.params.id

    // Base select for common fields
    const baseSelect = {
      id: true,
      email: true,
      username: true,
      fullname: true,
      quote: true,
      avatar: true,
      phone: true,
      address: true,
      birthDate: true,
      birthPlace: true,
      gender: true,
    }
    let selectOptions: Record<string, boolean | object> = { ...baseSelect }

    if (validation.query.isAdmin) {
      selectOptions = {
        ...selectOptions,
        isActive: true,
        isPublic: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: identifier },
      select: selectOptions,
    })
    if (!user) {
      return ResponseHandler.notFound("User tidak ditemukan")
    }

    // Postman: ?fields= untuk payload fokus.
    const allowedFields = Object.keys(selectOptions)
    const { fields, unknown } = parseFields(validation.query.fields, allowedFields)
    if (validation.query.fields && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${allowedFields.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR" },
      )
    }

    // Normalisasi avatar: proxy URL attachment, URL eksternal, atau null.
    const avatar = toAttachmentUrl((user as { avatar?: string | null }).avatar ?? null)
    return ResponseHandler.success(
      "User fetched successfully",
      applyFields({ ...user, avatar }, fields),
      {
        requestId: getRequestId(request),
      },
    )
  } catch (error) {
    await logActivity(userId ?? "anonymous", "ERROR", "User", identifier, {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal mengambil data user", error)
  }
}

// PUT /users/{id} — full update (role ikut di-reset sesuai roleIds).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({
    permissions: ["users:update"],
  })
  if (error) return error
  const userId = session?.user?.id
  const { id: paramId } = await params

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        params: paramsSchema,
        body: UpdateUserSchema,
      }),
      request,
      params,
    )
    if (validation instanceof NextResponse) return validation

    const { id } = validation.params
    const { username, email, fullname, avatar, quote, isActive, roleIds, isPublic, isSuperAdmin } =
      validation.body
    const user = await prisma.user.findUnique({
      where: { id },
    })
    if (!user) {
      return ResponseHandler.notFound("User tidak ditemukan")
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        username,
        email,
        fullname,
        avatar,
        quote,
        phone: validation.body.phone,
        address: validation.body.address,
        birthDate: validation.body.birthDate,
        birthPlace: validation.body.birthPlace,
        gender: validation.body.gender,
        isActive,
        isPublic,
        isSuperAdmin,
        userRoles: {
          deleteMany: {},
          create:
            roleIds?.map((roleId: string) => ({
              role: { connect: { id: roleId } },
            })) || [],
        },
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        username: true,
        phone: true,
        address: true,
        birthDate: true,
        birthPlace: true,
        gender: true,
        isActive: true,
        isSuperAdmin: true,
        isPublic: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })

    await logActivity(userId, "UPDATE", "User", id, { oldUsername: user.username })
    if (avatar !== undefined && user.avatar && user.avatar !== avatar) {
      void deleteAttachmentByUrl(user.avatar)
    }
    return ResponseHandler.success("User berhasil diperbarui", updatedUser)
  } catch (error) {
    await logActivity(userId, "ERROR", "User", paramId, {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal memperbarui user", error)
  }
}

// PATCH /users/{id} — partial update, hanya field yang dikirim yang diubah.
// Berbeda dengan PUT, role tidak di-reset saat `roleIds` tidak dikirim.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({
    permissions: ["users:update"],
  })
  if (error) return error
  const actorId = session?.user?.id ?? "system"
  const { id: paramId } = await params

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        params: paramsSchema,
        body: PartialUpdateUserSchema,
      }),
      request,
      params,
    )
    if (validation instanceof NextResponse) return validation

    const { id } = validation.params
    const body = validation.body

    const user = await prisma.user.findUnique({
      where: { id },
    })
    if (!user) {
      return ResponseHandler.notFound("User tidak ditemukan")
    }

    if (body.email && body.email !== user.email) {
      const clash = await prisma.user.findFirst({
        where: { email: body.email, NOT: { id } },
      })
      if (clash) return ResponseHandler.conflict("Email sudah digunakan", { field: "email" })
    }
    if (body.username && body.username !== user.username) {
      const clash = await prisma.user.findFirst({
        where: { username: body.username, NOT: { id } },
      })
      if (clash) return ResponseHandler.conflict("Username sudah digunakan", { field: "username" })
    }

    const data: Record<string, unknown> = {}
    for (const key of [
      "username",
      "email",
      "fullname",
      "avatar",
      "quote",
      "phone",
      "address",
      "birthDate",
      "birthPlace",
      "gender",
      "isActive",
      "isPublic",
      "isSuperAdmin",
    ] as const) {
      if (body[key] !== undefined) data[key] = body[key]
    }
    // Role hanya disentuh jika roleIds dikirim eksplisit (hindari reset tak sengaja).
    if (body.roleIds !== undefined) {
      data.userRoles = {
        deleteMany: {},
        create: body.roleIds.map((roleId: string) => ({
          role: { connect: { id: roleId } },
        })),
      }
    }

    if (Object.keys(data).length === 0) {
      return ResponseHandler.badRequest("Tidak ada field yang diubah", { field: "body" })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullname: true,
        username: true,
        phone: true,
        address: true,
        birthDate: true,
        birthPlace: true,
        gender: true,
        isActive: true,
        isSuperAdmin: true,
        isPublic: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })

    await logActivity(actorId, "UPDATE", "User", id, { oldUsername: user.username, partial: true })
    if (body.avatar !== undefined && user.avatar && user.avatar !== body.avatar) {
      void deleteAttachmentByUrl(user.avatar)
    }
    return ResponseHandler.success("User berhasil diperbarui", updatedUser)
  } catch (err) {
    await logActivity(actorId, "ERROR", "User", paramId, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal memperbarui user", err)
  }
}

// DELETE /users/{id} — soft delete (isActive=false + deletedAt).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth({
    permissions: ["users:delete"],
  })
  if (error) return error
  const userId = session?.user?.id
  const { id: deleteParamId } = await params

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        params: paramsSchema,
      }),
      request,
      params,
    )
    if (validation instanceof NextResponse) return validation

    const { id } = validation.params
    const user = await prisma.user.findUnique({
      where: { id },
    })
    if (!user) {
      return ResponseHandler.notFound("User tidak ditemukan")
    }

    // Soft delete: set isActive to false and deletedAt to current timestamp
    await prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    })

    await logActivity(userId, "DELETE", "User", id, { username: user.username })
    return ResponseHandler.success("User berhasil dihapus")
  } catch (error) {
    await logActivity(userId, "ERROR", "User", deleteParamId, {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal menghapus user", error)
  }
}
