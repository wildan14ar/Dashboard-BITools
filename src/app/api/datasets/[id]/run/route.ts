import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { engineErrorResponse, execute } from "@/lib/engine"
import { rateLimit } from "@/lib/rate-limit"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["datasets:read"] })
  if (error) return error

  const rl = await rateLimit(`run:${session.user.id}`)
  if (!rl.ok) {
    return ResponseHandler.tooManyRequests(
      `Terlalu banyak query, coba lagi dalam ${rl.retryAfterSec} detik`,
    )
  }

  try {
    const { id } = await params
    const dataset = await prisma.biDataset.findUnique({ where: { id }, include: { source: true } })
    if (!dataset?.source) return ResponseHandler.notFound("Dataset atau source tidak ditemukan")

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
      return engineErrorResponse(err)
    }
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menjalankan dataset", err)
  }
}
