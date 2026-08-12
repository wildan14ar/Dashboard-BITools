import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { datasetSchema } from "@/validation/dataset"
import { requireAuth, unauthorized, parseBody } from "@/lib/api"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id } = await params
  const dataset = await prisma.biDataset.findUnique({
    where: { id },
    include: { source: true },
  })
  if (!dataset) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(dataset)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id } = await params
  const { data, error } = await parseBody(req, datasetSchema)
  if (error) return error

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
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id } = await params
  await prisma.biDataset.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
