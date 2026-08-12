import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { testConnection } from "@/lib/engine"
import { requireAdmin, forbidden, cleanError } from "@/lib/api"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const { id } = await params
  const source = await prisma.biSource.findUnique({ where: { id } })
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const result = await testConnection({
      sourceId: source.id,
      dbType: source.type,
      configJson: JSON.stringify(source.config ?? {}),
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ ok: false, error: cleanError(err) }, { status: 500 })
  }
}
