import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  ATTACHMENT_SORT_FIELDS,
  countAttachments,
  create,
  getAll,
  StorageError,
} from "@/config/storage"
import { logActivity } from "@/lib/activity"
import { applyFieldsMany, parseFields } from "@/lib/fields"
import { idempotencyScope, rememberIdempotent, tryReplayIdempotent } from "@/lib/idempotency"
import { paginateMeta, parsePagination } from "@/lib/pagination"
import { getRequestId } from "@/lib/request-id"
import { parseSort } from "@/lib/sort"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

// GET /attachments — milik sendiri; ?isAdmin=true (attachments:admin) = semua user.
export async function GET(request: NextRequest) {
  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        query: z.object({
          isAdmin: z.coerce.boolean().optional(),
          page: z.string().optional(),
          limit: z.string().optional(),
          // Sort disanitasi via parseSort() (fallback ke default, tanpa 400).
          sort: z.string().optional(),
          order: z.string().optional(),
          // Postman: field selection — ?fields=fileName,fileUrl
          fields: z.string().optional(),
        }),
      }),
      request,
    )
    if (validation instanceof NextResponse) return validation

    const requestId = getRequestId(request)
    const { isAdmin, page: pageStr, limit: limitStr, fields: fieldsRaw } = validation.query
    const { page, limit, skip } = parsePagination({ page: pageStr, limit: limitStr })

    let ownerId: string | undefined
    if (isAdmin) {
      const { error } = await requireAuth({ permissions: ["attachments:admin"] })
      if (error) return error
    } else {
      const { error, session } = await requireAuth()
      if (error || !session) {
        return error ?? ResponseHandler.unauthorized("Tidak terautentikasi", { requestId })
      }
      ownerId = session.user.id
    }

    const allowedFields = ["id", "fileName", "fileUrl", "fileType", "fileSize", "user", "createdAt"]
    const { fields, unknown } = parseFields(fieldsRaw, allowedFields)
    if (fieldsRaw && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${allowedFields.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR", requestId },
      )
    }

    const { sort, order } = parseSort(validation.query, { allowed: ATTACHMENT_SORT_FIELDS })

    const [items, total] = await Promise.all([
      getAll(ownerId, {
        skip,
        take: limit,
        sort,
        order,
      }),
      countAttachments(ownerId),
    ])

    return ResponseHandler.paginated(
      "Attachments fetched successfully",
      applyFieldsMany(items, fields),
      paginateMeta(page, limit, total),
      { requestId },
    )
  } catch (error) {
    return ResponseHandler.internalError("Failed to fetch attachments", error)
  }
}

// POST /attachments — upload file (multipart, field "file").
// Butuh login saja (kepemilikan = uploader); tidak butuh permission khusus
// agar user biasa tetap bisa ganti avatar — pola yang sama dengan PUT /auth/me.
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  const requestId = getRequestId(request)

  // Retry aman: header Idempotency-Key mengembalikan respons tersimpan.
  const scope = idempotencyScope(session.user.id)
  const replay = await tryReplayIdempotent(request, scope)
  if (replay) return replay

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        body: z.object({
          file: z.instanceof(File),
        }),
      }),
      request,
    )
    if (validation instanceof NextResponse) return validation

    const attachment = await create(validation.body.file, session.user.id)
    await logActivity(session.user.id, "CREATE", "attachment", attachment.id)
    return rememberIdempotent(
      request,
      scope,
      ResponseHandler.created("File uploaded successfully", attachment, { requestId }),
    )
  } catch (error) {
    await logActivity(session?.user?.id || "system", "ERROR", "attachment", undefined, {
      error: String(error),
    })
    if (error instanceof StorageError) {
      const code = error.code === "FILE_TOO_LARGE" ? "UNPROCESSABLE" : "BAD_REQUEST"
      return ResponseHandler.badRequest(error.message, undefined, { code, requestId })
    }
    return ResponseHandler.internalError("Upload failed", error, { requestId })
  }
}
