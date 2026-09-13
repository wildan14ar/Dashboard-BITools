import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { execute, cleanError } from "@/lib/engine"
import { settings } from "@/config/settings"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const source = await prisma.biSource.findUnique({ where: { id } })
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  if (!body.sql || typeof body.sql !== "string") return NextResponse.json({ error: "SQL required" }, { status: 400 })

  const useCache = body.cache !== false

  try {
    const result = await execute({
      sourceId: source.id,
      dbType: source.type,
      configJson: JSON.stringify(source.config ?? {}),
      sql: body.sql,
      maxRows: settings.query.maxRows,
      timeoutSec: settings.query.timeoutSec,
      useCache,
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: cleanError(err) }, { status: 500 })
  }
}
