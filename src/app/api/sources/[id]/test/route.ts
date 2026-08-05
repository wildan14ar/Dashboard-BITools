import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { testConnection } from "@/lib/query-engine"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

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
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
