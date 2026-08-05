import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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

  const body = await req.json()
  const parsed = datasetSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const dataset = await prisma.biDataset.create({
    data: {
      name: parsed.data.name,
      sql: parsed.data.sql,
      description: parsed.data.description,
      sourceId: parsed.data.sourceId,
      isPublic: parsed.data.isPublic ?? false,
      userId: session.user.id,
    },
  })
  return NextResponse.json(dataset, { status: 201 })
}
