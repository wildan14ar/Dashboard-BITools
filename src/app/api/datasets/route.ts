import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestHandler } from "@/middlewares/request-handler"
import { datasetSchema } from "@/validation/dataset"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const datasets = await prisma.biDataset.findMany({
    include: { source: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(datasets)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
  return NextResponse.json(dataset, { status: 201 })
}
