import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { cleanError, testConnection } from "@/lib/engine"
import { ResponseHandler, requireAuth } from "@/middlewares"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["sources:read"] })
  if (error) return error

  try {
    const { id } = await params
    const source = await prisma.biSource.findUnique({ where: { id } })
    if (!source) return ResponseHandler.notFound("Source tidak ditemukan")

    try {
      const result = await testConnection({
        sourceId: source.id,
        dbType: source.type,
        configJson: JSON.stringify(source.config ?? {}),
      })
      return ResponseHandler.success("Connection test successful", result)
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
    return ResponseHandler.internalError("Gagal mengetes koneksi", err)
  }
}
