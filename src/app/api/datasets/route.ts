import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { datasetSchema } from "@/validations"

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const datasets = await prisma.biDataset.findMany({
      include: { source: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
    return ResponseHandler.success("Datasets fetched successfully", datasets)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengambil datasets", err)
  }
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["datasets:create"] })
  if (error) return error

  try {
    const validated = await RequestHandler.validateRequest(z.object({ body: datasetSchema }), req)
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    const dataset = await prisma.biDataset.create({
      data: {
        name: data.name,
        sql: data.sql,
        description: data.description,
        sourceId: data.sourceId,
        isPublic: data.isPublic ?? false,
        userId: session.user.id,
      },
    })

    await logActivity(session.user.id, "CREATE", "BiDataset", dataset.id, { name: dataset.name })
    return ResponseHandler.created("Dataset berhasil dibuat", dataset)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiDataset", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal membuat dataset", err)
  }
}
