import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestHandler } from "@/middlewares/request-handler"
import { filterSchema } from "@/validation/filter"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dashboardId } = await params
  const validated = await RequestHandler.validateRequest(z.object({ body: filterSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

  const filter = await prisma.biFilter.create({
    data: { ...data, dashboardId, config: (data.config ?? {}) as object },
  })
  return NextResponse.json(filter, { status: 201 })
}
