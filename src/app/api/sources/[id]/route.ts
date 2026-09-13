import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { invalidateCache } from "@/lib/engine"
import { RequestHandler } from "@/middlewares/request-handler"
import { sourceSchema } from "@/validation/source"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const source = await prisma.biSource.findUnique({ where: { id } })
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(source)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const validated = await RequestHandler.validateRequest(z.object({ body: sourceSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

  const source = await prisma.biSource.update({
    where: { id },
    data: { name: data.name, type: data.type, config: data.config as object },
  })
  invalidateCache(id).catch(() => {}) // cache stale setelah config berubah
  return NextResponse.json(source)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  await prisma.biSource.delete({ where: { id } })
  invalidateCache(id).catch(() => {}) // cache stale setelah source dihapus
  return NextResponse.json({ ok: true })
}
