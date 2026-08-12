import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { datasetSchema } from "@/validation/dataset"
import { requireAuth, unauthorized, parseBody } from "@/lib/api"

export async function GET() {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const datasets = await prisma.biDataset.findMany({
    include: { source: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(datasets)
}

export async function POST(req: Request) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { data, error } = await parseBody(req, datasetSchema)
  if (error) return error

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
