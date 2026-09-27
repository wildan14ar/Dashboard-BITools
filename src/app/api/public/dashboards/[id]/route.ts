import type { NextRequest } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { ResponseHandler } from "@/middlewares"

/**
 * Baca dashboard PUBLIK tanpa session — dipakai /bi/[id] (viewer) dan
 * /bi/embed/[id] (embed iframe di situs lain).
 *
 * Diff dengan /api/dashboards/[id]:
 * - tanpa requireAuth; obscurity isPublic=false ⇒ 404 (bukan 403) supaya
 *   id yang tidak publik tidak bisa dipetakan lewat perbedaan status.
 * - HANYA panel dengan `dataSetId != null` yang dikembalikan, dan field
 *   yang dikembalikan dibatasi eksplisit (tanpa userId/members). Dataset
 *   yang di-query panel diambil lewat run-batch biasa yang tetap butuh auth,
 *   jadi embed anonim akan tampil "No data" sampai diberi akses API key.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const dashboard = await prisma.biDashboard.findFirst({
      where: { id, isPublic: true },
      select: {
        id: true,
        name: true,
        isPublic: true,
        panels: {
          where: { dataSetId: { not: null } },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            dataSetId: true,
            title: true,
            chartType: true,
            config: true,
            x: true,
            y: true,
            w: true,
            h: true,
          },
        },
      },
    })

    if (!dashboard) return ResponseHandler.notFound("Dashboard tidak ditemukan")

    return ResponseHandler.success("Dashboard fetched successfully", dashboard)
  } catch (err) {
    await logActivity("system", "ERROR", "BiDashboard", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengambil dashboard", err)
  }
}
