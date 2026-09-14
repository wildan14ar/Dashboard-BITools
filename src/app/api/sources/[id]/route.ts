import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { invalidateCache } from "@/lib/engine"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { sourceSchema } from "@/validations"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["sources:read"] })
  if (error) return error

  try {
    const { id } = await params
    const source = await prisma.biSource.findUnique({ where: { id } })
    if (!source) return ResponseHandler.notFound("Source tidak ditemukan")
    return ResponseHandler.success("Source fetched successfully", source)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiSource", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengambil source", err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["sources:update"] })
  if (error) return error

  try {
    const { id } = await params
    const validated = await RequestHandler.validateRequest(z.object({ body: sourceSchema }), req)
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    const source = await prisma.biSource.update({
      where: { id },
      data: { name: data.name, type: data.type, config: data.config as object },
    })
    invalidateCache(id).catch(() => {}) // cache stale setelah config berubah

    await logActivity(session.user.id, "UPDATE", "BiSource", source.id, { name: source.name })
    return ResponseHandler.success("Source berhasil diperbarui", source)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiSource", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal memperbarui source", err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["sources:delete"] })
  if (error) return error

  try {
    const { id } = await params
    await prisma.biSource.delete({ where: { id } })
    invalidateCache(id).catch(() => {}) // cache stale setelah source dihapus

    await logActivity(session.user.id, "DELETE", "BiSource", id)
    return ResponseHandler.success("Source berhasil dihapus", { ok: true })
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiSource", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menghapus source", err)
  }
}
