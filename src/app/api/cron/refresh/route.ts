import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { settings } from "@/config/settings"
import { logActivity } from "@/lib/activity"
import { execute } from "@/lib/engine"
import { RequestHandler, ResponseHandler } from "@/middlewares"

const cronRefreshSchema = z.object({
  datasetIds: z.array(z.string().min(1)).max(100).optional(),
})

/**
 * Cache warmer untuk cron: jalankan ulang dataset publik agar cache Redis
 * hangat sebelum jam kerja. Auth via header `x-cron-secret` (CRON_SECRET).
 * Dataset berparameter wajib dilewati (skipped) karena tak ada nilai filter.
 */
export async function POST(req: NextRequest) {
  if (!settings.cron.secret) {
    return ResponseHandler.forbidden("Cron refresh belum dikonfigurasi")
  }
  const provided = req.headers.get("x-cron-secret")
  if (!provided || provided !== settings.cron.secret) {
    return ResponseHandler.unauthorized("Cron secret tidak valid")
  }

  const validated = await RequestHandler.validateRequest(z.object({ body: cronRefreshSchema }), req)
  if (validated instanceof NextResponse) return validated

  try {
    const datasets = await prisma.biDataset.findMany({
      where: {
        isPublic: true,
        sourceId: { not: null },
        ...(validated.body.datasetIds ? { id: { in: validated.body.datasetIds } } : {}),
      },
      include: { source: true },
    })

    let refreshed = 0
    let skipped = 0
    const failed: string[] = []
    for (const dataset of datasets) {
      if (!dataset.source) continue
      if (/\{\{\w+\}\}/.test(dataset.sql)) {
        skipped += 1
        continue
      }
      try {
        await execute({
          sourceId: dataset.source.id,
          dbType: dataset.source.type,
          configJson: JSON.stringify(dataset.source.config ?? {}),
          sql: dataset.sql,
          params: {},
          useCache: true,
        })
        refreshed += 1
      } catch (err) {
        failed.push(dataset.id)
        await logActivity("system", "ERROR", "BiDataset", dataset.id, {
          error: String(err),
          cron: true,
        })
      }
    }

    if (refreshed > 0) {
      await prisma.biDataset.updateMany({
        where: { id: { in: datasets.map((d) => d.id) } },
        data: { lastRunAt: new Date() },
      })
    }
    await logActivity("system", "CRON_REFRESH", "BiDataset", undefined, {
      refreshed,
      skipped,
      failed: failed.length,
    })
    return ResponseHandler.success("Cache refresh selesai", { refreshed, skipped, failed })
  } catch (err) {
    await logActivity("system", "ERROR", "BiDataset", undefined, { error: String(err) })
    return ResponseHandler.internalError("Gagal refresh cache", err)
  }
}
