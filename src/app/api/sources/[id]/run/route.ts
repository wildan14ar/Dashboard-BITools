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
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { id } = await params
  const source = await prisma.biSource.findUnique({ where: { id } })
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { sql, cache, page, pageSize } = await req.json()
  if (!sql || typeof sql !== "string") return NextResponse.json({ error: "SQL required" }, { status: 400 })

  const useCache = cache !== false
  const p = Math.max(1, Number(page) || 1)
  const size = Math.max(0, Number(pageSize) || 0)

  try {
    const result = await execute({
      sourceId: source.id,
      dbType: source.type,
      configJson: JSON.stringify(source.config ?? {}),
      sql,
      maxRows: 200,
      timeoutSec: 30,
      useCache,
      limit: size > 0 ? size : undefined,
      offset: size > 0 ? (p - 1) * size : 0,
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: cleanError(err) }, { status: 500 })
  }
}
