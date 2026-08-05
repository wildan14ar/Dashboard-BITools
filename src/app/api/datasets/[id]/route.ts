import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
  const body = await req.json()
  const parsed = datasetSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const dataset = await prisma.biDataset.update({
    where: { id },
    data: {
      name: parsed.data.name,
      sql: parsed.data.sql,
      description: parsed.data.description,
      sourceId: parsed.data.sourceId,
      isPublic: parsed.data.isPublic,
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
