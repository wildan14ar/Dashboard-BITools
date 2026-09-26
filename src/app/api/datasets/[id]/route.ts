import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { datasetSchema } from "@/validations"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const { id } = await params
    const dataset = await prisma.biDataset.findUnique({
      where: { id },
      include: { source: true },
    })
    if (!dataset) return ResponseHandler.notFound("Dataset tidak ditemukan")
    return ResponseHandler.success("Dataset fetched successfully", dataset)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengambil dataset", err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["datasets:update"] })
  if (error) return error

  try {
    const { id } = await params
    const validated = await RequestHandler.validateRequest(z.object({ body: datasetSchema }), req)
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    const dataset = await prisma.biDataset.update({
      where: { id },
      data: {
        name: data.name,
        sql: data.sql,
        description: data.description,
        sourceId: data.sourceId,
        isPublic: data.isPublic,
      },
    })

    await logActivity(session.user.id, "UPDATE", "BiDataset", dataset.id, { name: dataset.name })
    return ResponseHandler.success("Dataset berhasil diperbarui", dataset)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal memperbarui dataset", err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["datasets:delete"] })
  if (error) return error

  try {
    const { id } = await params
    await prisma.biDataset.delete({ where: { id } })

    await logActivity(session.user.id, "DELETE", "BiDataset", id)
    return ResponseHandler.success("Dataset berhasil dihapus", { ok: true })
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menghapus dataset", err)
  }
}
