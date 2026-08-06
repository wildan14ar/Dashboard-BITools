import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { execute } from "@/lib/engine"

function cleanError(err: unknown): string {
  if (err && typeof err === "object" && "details" in err) return String(err.details)
  if (err instanceof Error) return err.message
  return String(err)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const dataset = await prisma.biDataset.findUnique({ where: { id }, include: { source: true } })
  if (!dataset || !dataset.source) return NextResponse.json({ error: "Dataset or source not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const paramsOverrides = body.params ?? {}
  const cache = body.cache !== false
  const page = Math.max(1, Number(body.page) || 1)
  const pageSize = Math.max(0, Number(body.pageSize) || 0)

  try {
    const result = await execute({
      sourceId: dataset.source.id,
      dbType: dataset.source.type,
      configJson: JSON.stringify(dataset.source.config ?? {}),
      sql: dataset.sql,
      params: paramsOverrides,
      useCache: cache,
      limit: pageSize > 0 ? pageSize : undefined,
      offset: pageSize > 0 ? (page - 1) * pageSize : 0,
    })

    await prisma.biDataset.update({ where: { id }, data: { lastRunAt: new Date() } })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: cleanError(err) }, { status: 500 })
  }
}
