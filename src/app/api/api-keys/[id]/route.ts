import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

const ParamsSchema = z.object({ params: z.object({ id: z.string().min(1) }) })

// PUT /api-keys/[id] — update milik sendiri (butuh keys:update).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["keys:update"] })
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  if (!session.session) {
    return ResponseHandler.forbidden("Kelola API key melalui login")
  }
  const requestId = getRequestId(request)

  const validation = await RequestHandler.validateRequest(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({
        name: z.string().min(1).max(100).optional(),
        isActive: z.boolean().optional(),
        expiresAt: z.coerce.date().nullable().optional(),
      }),
    }),
    request,
    params,
  )
  if (validation instanceof NextResponse) return validation

  try {
    const target = await prisma.apiKey.findFirst({
      where: { id: validation.params.id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    })
    if (!target) {
      return ResponseHandler.notFound("API key tidak ditemukan", { requestId })
    }

    const { name, isActive, expiresAt } = validation.body
    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (isActive !== undefined) data.isActive = isActive
    if (expiresAt !== undefined) {
      if (expiresAt && expiresAt.getTime() <= Date.now()) {
        return ResponseHandler.unprocessable("expiresAt harus di masa depan", {
          field: "expiresAt",
        })
      }
      data.expiresAt = expiresAt
    }

    if (Object.keys(data).length === 0) {
      return ResponseHandler.badRequest("Tidak ada field yang diubah", { field: "body" })
    }

    const updated = await prisma.apiKey.update({
      where: { id: target.id },
      data,
      select: {
        id: true,
        name: true,
        prefix: true,
        isActive: true,
        expiresAt: true,
        updatedAt: true,
      },
    })
    await logActivity(session.user.id, "UPDATE", "ApiKey", target.id, {})

    return ResponseHandler.success("API key diperbarui", updated, { requestId })
  } catch (err) {
    return ResponseHandler.internalError("Gagal memperbarui API key", err, { requestId })
  }
}

// DELETE /api-keys/[id] — cabut (soft delete) milik sendiri (butuh keys:delete).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth({ permissions: ["keys:delete"] })
  if (error || !session) {
    return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
  }
  if (!session.session) {
    return ResponseHandler.forbidden("Kelola API key melalui login")
  }
  const requestId = getRequestId(request)

  const validation = await RequestHandler.validateRequest(ParamsSchema, request, params)
  if (validation instanceof NextResponse) return validation

  try {
    const target = await prisma.apiKey.findFirst({
      where: { id: validation.params.id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    })
    if (!target) {
      return ResponseHandler.notFound("API key tidak ditemukan", { requestId })
    }

    await prisma.apiKey.update({
      where: { id: target.id },
      data: { isActive: false, deletedAt: new Date() },
    })
    await logActivity(session.user.id, "DELETE", "ApiKey", target.id, {})

    return ResponseHandler.success("API key dicabut", { id: target.id }, { requestId })
  } catch (err) {
    return ResponseHandler.internalError("Gagal mencabut API key", err, { requestId })
  }
}
