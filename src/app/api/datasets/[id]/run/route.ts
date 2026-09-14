import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { cleanError, execute } from "@/lib/engine"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["datasets:read"] })
  if (error) return error

  try {
    const { id } = await params
    const dataset = await prisma.biDataset.findUnique({ where: { id }, include: { source: true } })
    if (!dataset || !dataset.source)
      return ResponseHandler.notFound("Dataset atau source tidak ditemukan")

    const body = await req.json().catch(() => ({}))
    const paramsOverrides = body.params ?? {}
    const cache = body.cache !== false

    try {
      const result = await execute({
        sourceId: dataset.source.id,
        dbType: dataset.source.type,
        configJson: JSON.stringify(dataset.source.config ?? {}),
        sql: dataset.sql,
        params: paramsOverrides,
        useCache: cache,
      })

      await prisma.biDataset.update({ where: { id }, data: { lastRunAt: new Date() } })
      await logActivity(session.user.id, "EXECUTE", "BiDataset", id, { name: dataset.name })
      return ResponseHandler.success("Dataset executed successfully", result)
    } catch (err) {
      await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", id, {
        error: String(err),
      })
      return ResponseHandler.internalError(cleanError(err), err)
    }
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menjalankan dataset", err)
  }
}
