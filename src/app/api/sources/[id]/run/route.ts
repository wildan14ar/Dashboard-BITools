import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { settings } from "@/config/settings"
import { logActivity } from "@/lib/activity"
import { cleanError, execute } from "@/lib/engine"
import { rateLimit } from "@/lib/rate-limit"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["sources:read"] })
  if (error) return error

  const rl = rateLimit(`run:${session.user.id}`)
  if (!rl.ok) {
    return ResponseHandler.tooManyRequests(
      `Terlalu banyak query, coba lagi dalam ${rl.retryAfterSec} detik`,
    )
  }

  try {
    const { id } = await params
    const source = await prisma.biSource.findUnique({ where: { id } })
    if (!source) return ResponseHandler.notFound("Source tidak ditemukan")

    const body = await req.json()
    if (!body.sql || typeof body.sql !== "string")
      return ResponseHandler.badRequest("SQL wajib diisi")

    const useCache = body.cache !== false

    try {
      const result = await execute({
        sourceId: source.id,
        dbType: source.type,
        configJson: JSON.stringify(source.config ?? {}),
        sql: body.sql,
        maxRows: settings.query.maxRows,
        timeoutSec: settings.query.timeoutSec,
        useCache,
      })
      await logActivity(session.user.id, "EXECUTE", "BiSource", source.id, { name: source.name })
      return ResponseHandler.success("Query executed successfully", result)
    } catch (err) {
      await logActivity(session?.user?.id || "system", "ERROR", "BiSource", source.id, {
        error: String(err),
      })
      return ResponseHandler.internalError(cleanError(err), err)
    }
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiSource", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menjalankan query", err)
  }
}
