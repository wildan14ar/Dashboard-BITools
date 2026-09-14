import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { sourceSchema } from "@/validations"

export async function GET() {
  const { error, session } = await requireAuth({ permissions: ["sources:read"] })
  if (error) return error

  try {
    const sources = await prisma.biSource.findMany({ orderBy: { createdAt: "desc" } })
    return ResponseHandler.success("Sources fetched successfully", sources)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiSource", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengambil sources", err)
  }
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["sources:create"] })
  if (error) return error

  try {
    const validated = await RequestHandler.validateRequest(z.object({ body: sourceSchema }), req)
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    const source = await prisma.biSource.create({
      data: { name: data.name, type: data.type, config: data.config as object },
    })

    await logActivity(session.user.id, "CREATE", "BiSource", source.id, { name: source.name })
    return ResponseHandler.created("Source berhasil dibuat", source)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiSource", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal membuat source", err)
  }
}
