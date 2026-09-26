import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { toAttachmentUrl } from "@/config/storage"
import { logActivity } from "@/lib/activity"
import { applyFieldsMany, parseFields } from "@/lib/fields"
import { idempotencyScope, rememberIdempotent, tryReplayIdempotent } from "@/lib/idempotency"
import { paginateMeta, parsePagination } from "@/lib/pagination"
import { setCredentialPassword } from "@/lib/password"
import { getRequestId } from "@/lib/request-id"
import { parseSort } from "@/lib/sort"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { UserFilterSchema, UserSchema } from "@/validations"

export async function GET(request: NextRequest) {
  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        query: UserFilterSchema,
      }),
      request,
    )
    if (validation instanceof NextResponse) return validation

    const {
      page: pageStr,
      limit: limitStr,
      search,
      sort: sortRaw,
      order: orderRaw,
      isAdmin,
      fields: fieldsRaw,
    } = validation.query
    const { page, limit, skip } = parsePagination({ page: pageStr, limit: limitStr })
    const { sort, order } = parseSort(
      { sort: sortRaw, order: orderRaw },
      { allowed: ["createdAt", "fullname", "username", "email"] },
    )
    const requestId = getRequestId(request)

    // Postman: ?fields= untuk payload fokus (mobile/low-bandwidth).
    const allowedFields = isAdmin
      ? [
          "id",
          "email",
          "username",
          "fullname",
          "quote",
          "avatar",
          "phone",
          "address",
          "birthDate",
          "birthPlace",
          "gender",
          "userRoles",
          "isActive",
          "isPublic",
          "isSuperAdmin",
          "createdAt",
          "updatedAt",
        ]
      : [
          "id",
          "email",
          "username",
          "fullname",
          "quote",
          "avatar",
          "phone",
          "address",
          "birthDate",
          "birthPlace",
          "gender",
          "userRoles",
        ]
    const { fields, unknown } = parseFields(fieldsRaw, allowedFields)
    if (fieldsRaw && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${allowedFields.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR", requestId },
      )
    }
    if (isAdmin) {
      const { error: adminError } = await requireAuth({
        permissions: ["users:admin"],
      })
      if (adminError) return adminError
    }

    type WhereInput = {
      isActive?: boolean
      isPublic?: boolean
      OR?: Array<
        | { email?: { contains: string; mode: "insensitive" } }
        | { username?: { contains: string; mode: "insensitive" } }
        | { fullname?: { contains: string; mode: "insensitive" } }
      >
    }
    const where: WhereInput = {}

    if (!isAdmin) {
      where.isActive = true
      where.isPublic = true
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { fullname: { contains: search, mode: "insensitive" } },
      ]
    }

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
      userRoles: {
        // Role tidak punya flag visibilitas; tampilkan apa adanya di publik.
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    }

    const adminSelect = {
      ...baseSelect,
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
      isActive: true,
      isPublic: true,
      isSuperAdmin: true,
      createdAt: true,
      updatedAt: true,
    }

    const selectOptions = isAdmin ? adminSelect : baseSelect
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sort]: order },
        select: selectOptions,
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ])

    const usersWithPhoto = users.map((user) => ({
      ...user,
      avatar: toAttachmentUrl(user.avatar),
    }))

    return ResponseHandler.paginated(
      "Users fetched successfully",
      applyFieldsMany(usersWithPhoto, fields),
      paginateMeta(page, limit, total),
      { requestId },
    )
  } catch (error) {
    await logActivity("system", "ERROR", "User", "unknown", {
      error: String(error),
    })
    return ResponseHandler.internalError("Gagal mengambil data user", error, {
      requestId: getRequestId(request),
    })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth({
    permissions: ["users:create"],
  })
  if (error) return error

  // Retry aman: header Idempotency-Key mengembalikan respons tersimpan.
  const scope = idempotencyScope(session?.user?.id)
  const replay = await tryReplayIdempotent(request, scope)
  if (replay) return replay

  try {
    const validations = await RequestHandler.validateRequest(
      z.object({
        body: UserSchema,
      }),
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
      phone,
      address,
      birthDate,
      birthPlace,
      gender,
      isActive,
      isSuperAdmin,
      isPublic,
      roleIds,
    } = validations.body
    // Avatar tervalidasi sebagai referensi attachment di UserSchema
    // (tolak base64 inline — upload via POST /api/attachments).
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })
    if (existingUser) {
      return ResponseHandler.conflict("Email atau username sudah digunakan", {
        field: existingUser.email === email ? "email" : "username",
      })
    }

    const user = await prisma.user.create({
      data: {
        email,
        fullname,
        username,
        avatar,
        quote,
        phone,
        address,
        birthDate,
        birthPlace,
        gender,
        isPublic,
        isActive,
        isSuperAdmin,
        userRoles: roleIds
          ? {
              create: roleIds.map((roleId: string) => ({
                role: { connect: { id: roleId } },
              })),
            }
          : undefined,
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

    await setCredentialPassword(user.id, password)

    await logActivity(session?.user?.id || "system", "CREATE", "User", user.id, {
      email: user.email,
    })
    return rememberIdempotent(
      request,
      scope,
      ResponseHandler.created("User berhasil dibuat", user, {
        requestId: getRequestId(request),
        headers: { Location: `/api/users/${user.id}` },
      }),
    )
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "User", "unknown", {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal membuat user", err)
  }
}
