import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { delete_, get, StorageError, update, updateMetadata } from "@/config/storage"
import { logActivity } from "@/lib/activity"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

// GET /attachments/{id} — stream file. PUBLIK tanpa auth agar avatar/logo
// yang dirujuk dokumen lain bisa di-load siapa saja (kepemilikan hanya
// dicek untuk PUT/DELETE).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        params: z.object({
          id: z.string(),
        }),
        query: z.object({
          isDownload: z.coerce.boolean().default(false),
        }),
      }),
      request,
      params,
    )
    if (validation instanceof NextResponse) return validation

    const requestId = getRequestId(request)
    const { id } = validation.params
    const { isDownload } = validation.query
    const result = await get(id, isDownload ? "download" : "preview")
    if (!result) {
      return ResponseHandler.notFound("Attachment not found", { requestId })
    }

    return new NextResponse(result.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": result.contentDisposition,
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(requestId ? { "X-Request-ID": requestId } : {}),
      },
    })
  } catch (error) {
    return ResponseHandler.internalError("Failed to fetch attachment", error)
  }
}

// PUT /attachments/{id} — update metadata (fileName) dan/atau re-upload isi.
// Butuh login + pemilik (atau attachments:update).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  const requestId = getRequestId(request)

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          fileName: z.string().optional(),
          // Re-upload opsional (multipart field "file").
          file: z.instanceof(File).optional(),
        }),
      }),
      request,
      params,
    )
    if (validation instanceof NextResponse) return validation
    const { id } = validation.params
    const { fileName, file } = validation.body

    // Pemilik boleh edit miliknya; non-pemilik butuh attachments:update.
    const { error: permError } = await requireAuth({ permissions: ["attachments:update"] })
    const ownerId = permError ? session.user.id : undefined

    if (file && file.size > 0) {
      const result = await update(id, file, ownerId)
      if (!result) {
        return ResponseHandler.notFound("Attachment not found", { requestId })
      }
      await logActivity(session.user.id, "UPDATE", "attachment", id)
      return ResponseHandler.success("Attachment file updated", result, { requestId })
    }

    // Update attachment metadata in database
    const result = await updateMetadata(id, { fileName }, ownerId)
    if (!result) {
      return ResponseHandler.badRequest("Failed to update attachment", undefined, { requestId })
    }

    await logActivity(session.user.id, "UPDATE", "attachment", id)
    return ResponseHandler.success("Attachment metadata updated", result, { requestId })
  } catch (error) {
    await logActivity(session?.user?.id || "system", "ERROR", "attachment", undefined, {
      error: String(error),
    })
    if (error instanceof StorageError) {
      const code = error.code === "FILE_TOO_LARGE" ? "UNPROCESSABLE" : "BAD_REQUEST"
      return ResponseHandler.badRequest(error.message, undefined, { code, requestId })
    }
    return ResponseHandler.internalError("Failed to update attachment", error, { requestId })
  }
}

// DELETE /attachments/{id} — pemilik atau attachments:delete.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth()
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  const requestId = getRequestId(request)

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        params: z.object({ id: z.string() }),
      }),
      request,
      params,
    )
    if (validation instanceof NextResponse) return validation

    const { id } = validation.params
    const { error: permError } = await requireAuth({ permissions: ["attachments:delete"] })
    const ownerId = permError ? session.user.id : undefined

    const result = await delete_(id, ownerId)
    if (!result.success) {
      if (result.message === "Attachment not found") {
        return ResponseHandler.notFound(result.message, { requestId })
      }
      return ResponseHandler.forbidden(result.message, { requestId })
    }

    await logActivity(session.user.id, "DELETE", "attachment", id)
    return ResponseHandler.success(result.message, null, { requestId })
  } catch (error) {
    return ResponseHandler.internalError("Failed to delete attachment", error, { requestId })
  }
}
