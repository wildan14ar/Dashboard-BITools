import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { execute } from "@/lib/query-engine"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const dataset = await prisma.biDataset.findUnique({ where: { id }, include: { source: true } })
  if (!dataset || !dataset.source) return NextResponse.json({ error: "Dataset or source not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const paramsOverrides = body.params ?? {}

  try {
    const result = await execute({
      sourceId: dataset.source.id,
      dbType: dataset.source.type,
      configJson: JSON.stringify(dataset.source.config ?? {}),
      sql: dataset.sql,
      params: paramsOverrides,
    })

    await prisma.biDataset.update({ where: { id }, data: { lastRunAt: new Date() } })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
