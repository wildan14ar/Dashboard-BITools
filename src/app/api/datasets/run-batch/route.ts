import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { engineErrorResponse, execute, mapEngineError } from "@/lib/engine"
import { rateLimit } from "@/lib/rate-limit"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { batchRunSchema } from "@/validations"

type BatchItemResult = {
  datasetId: string
  data: unknown | null
  error: string | null
}

/** Satu round-trip untuk N dataset (dashboard multi-panel). Gagal per item terisolasi. */
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["datasets:read"] })
  if (error) return error

  const rl = await rateLimit(`run:${session.user.id}`)
  if (!rl.ok) {
    return ResponseHandler.tooManyRequests(
      `Terlalu banyak query, coba lagi dalam ${rl.retryAfterSec} detik`,
    )
  }

  const validated = await RequestHandler.validateRequest(z.object({ body: batchRunSchema }), req)
  if (validated instanceof NextResponse) return validated
  const { items, useCache = true } = validated.body

  try {
    const ids = [...new Set(items.map((i) => i.datasetId))]
    const datasets = await prisma.biDataset.findMany({
      where: { id: { in: ids } },
      include: { source: true },
    })
    const byId = new Map(datasets.map((d) => [d.id, d]))

    const results: BatchItemResult[] = await Promise.all(
      items.map(async (item) => {
        const dataset = byId.get(item.datasetId)
        if (!dataset?.source) {
          return {
            datasetId: item.datasetId,
            data: null,
            error: "Dataset atau source tidak ditemukan",
          }
        }
        try {
          const result = await execute({
            sourceId: dataset.source.id,
            dbType: dataset.source.type,
            configJson: JSON.stringify(dataset.source.config ?? {}),
            sql: dataset.sql,
            params: item.params ?? {},
            useCache,
          })
          return { datasetId: item.datasetId, data: result, error: null }
        } catch (err) {
          await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", item.datasetId, {
            error: String(err),
          })
          return { datasetId: item.datasetId, data: null, error: mapEngineError(err).message }
        }
      }),
    )

    const succeeded = results.filter((r) => r.error === null).map((r) => r.datasetId)
    if (succeeded.length > 0) {
      await prisma.biDataset.updateMany({
        where: { id: { in: succeeded } },
        data: { lastRunAt: new Date() },
      })
    }
    await logActivity(session.user.id, "EXECUTE_BATCH", "BiDataset", undefined, {
      count: items.length,
      succeeded: succeeded.length,
    })
    return ResponseHandler.success("Batch executed successfully", results)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", undefined, {
      error: String(err),
    })
    return engineErrorResponse(err)
  }
}
