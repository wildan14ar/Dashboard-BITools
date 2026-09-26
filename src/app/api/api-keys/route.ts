import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { applyFieldsMany, parseFields } from "@/lib/fields"
import { idempotencyScope, rememberIdempotent, tryReplayIdempotent } from "@/lib/idempotency"
import { paginateMeta, parsePagination } from "@/lib/pagination"
import { getRequestId } from "@/lib/request-id"
import { parseSort } from "@/lib/sort"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { generateRawKey, generateSalt, hashApiKey } from "@/middlewares/apikeys"

// Manajemen API key HANYA via session login (API key tak bisa mencetak key baru).
function requireSession(session: { session: unknown } | null) {
  return !!session?.session
}

const CreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Nama wajib diisi").max(100),
    expiresAt: z.coerce.date().optional(),
    isMCP: z.boolean().optional().default(false),
    isRestfull: z.boolean().optional().default(true),
  }),
})

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["keys:read"] })
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  if (!requireSession(session)) {
    return ResponseHandler.forbidden("Kelola API key melalui login")
  }
  const requestId = getRequestId(request)

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        query: z
          .object({
            isAdmin: z.coerce.boolean().optional(),
            page: z.string().optional(),
            limit: z.string().optional(),
            // Sort disanitasi via parseSort() (fallback ke default, tanpa 400).
            sort: z.string().optional(),
            order: z.string().optional(),
            // Postman: field selection — ?fields=name,prefix
            fields: z.string().optional(),
          })
          .optional(),
      }),
      request,
    )
    if (validation instanceof NextResponse) return validation

    const { sort, order } = parseSort(validation.query ?? {}, {
      allowed: ["createdAt", "name", "lastUsedAt", "usageCount", "expiresAt"],
    })
    const { page, limit, skip } = parsePagination({
      page: validation.query?.page,
      limit: validation.query?.limit,
    })

    const allowedFields = [
      "id",
      "name",
      "prefix",
      "isActive",
      "isMCP",
      "isRestfull",
      "expiresAt",
      "lastUsedAt",
      "usageCount",
      "createdAt",
      "user",
    ]
    const { fields, unknown } = parseFields(validation.query?.fields, allowedFields)
    if (validation.query?.fields && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${allowedFields.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR", requestId },
      )
    }

    // ?isAdmin=true → semua user (tetap butuh keys:read).
    const where =
      validation.query?.isAdmin === true
        ? { deletedAt: null }
        : { userId: session.user.id, deletedAt: null }

    const [keys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        orderBy: { [sort]: order },
        take: limit,
        skip,
        select: {
          id: true,
          name: true,
          prefix: true,
          isActive: true,
          isMCP: true,
          isRestfull: true,
          expiresAt: true,
          lastUsedAt: true,
          usageCount: true,
          createdAt: true,
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.apiKey.count({ where }),
    ])

    return ResponseHandler.paginated(
      "API keys fetched",
      applyFieldsMany(keys, fields),
      paginateMeta(page, limit, total),
      { requestId },
    )
  } catch (err) {
    return ResponseHandler.internalError("Gagal mengambil API keys", err, { requestId })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["keys:create"] })
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  if (!requireSession(session)) {
    return ResponseHandler.forbidden("Kelola API key melalui login")
  }

  const scope = idempotencyScope(session.user.id)
  const replay = await tryReplayIdempotent(request, scope)
  if (replay) return replay
  const requestId = getRequestId(request)

  const validation = await RequestHandler.validateRequest(CreateSchema, request)
  if (validation instanceof NextResponse) return validation

  try {
    const { name, expiresAt, isMCP, isRestfull } = validation.body

    if (!isMCP && !isRestfull) {
      return ResponseHandler.unprocessable("Pilih minimal satu tipe: REST atau MCP", {
        field: "isRestfull",
      })
    }

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return ResponseHandler.unprocessable("expiresAt harus di masa depan", {
        field: "expiresAt",
      })
    }

    const { key, prefix } = generateRawKey()
    const salt = generateSalt()
    const created = await prisma.apiKey.create({
      data: {
        name,
        prefix,
        keyHash: await hashApiKey(salt, key),
        keySalt: salt,
        userId: session.user.id,
        isMCP,
        isRestfull,
        expiresAt: expiresAt ?? null,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    await logActivity(session.user.id, "CREATE", "ApiKey", created.id, { name, prefix })

    // `key` full hanya muncul SEKALI di sini — simpan baik-baik.
    // Hak akses key = permission pemilik saat dipakai (tanpa scope per-key).
    return rememberIdempotent(
      request,
      scope,
      ResponseHandler.created(
        "API key dibuat. Salin sekarang — tidak ditampilkan lagi.",
        { ...created, key },
        { requestId },
      ),
    )
  } catch (err) {
    await logActivity(session.user.id, "ERROR", "ApiKey", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal membuat API key", err, { requestId })
  }
}
