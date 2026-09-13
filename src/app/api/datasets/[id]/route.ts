import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestHandler } from "@/middlewares/request-handler"
import { datasetSchema } from "@/validation/dataset"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const dataset = await prisma.biDataset.findUnique({
    where: { id },
    include: { source: true },
  })
  if (!dataset) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(dataset)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const validated = await RequestHandler.validateRequest(z.object({ body: datasetSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

  const dataset = await prisma.biDataset.update({
    where: { id },
    data: {
      name: data.name,
      sql: data.sql,
      description: data.description,
      sourceId: data.sourceId,
      isPublic: data.isPublic,
    },
  })
  return NextResponse.json(dataset)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.biDataset.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
