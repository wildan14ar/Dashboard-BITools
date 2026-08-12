import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { invalidateCache } from "@/lib/engine"
import { sourceSchema } from "@/validation/source"
import { requireAdmin, forbidden, parseBody } from "@/lib/api"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const { id } = await params
  const source = await prisma.biSource.findUnique({ where: { id } })
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(source)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const { id } = await params
  const { data, error } = await parseBody(req, sourceSchema)
  if (error) return error

  const source = await prisma.biSource.update({
    where: { id },
    data: { name: data.name, type: data.type, config: data.config as object },
  })
  invalidateCache(id).catch(() => {}) // cache stale setelah config berubah
  return NextResponse.json(source)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const { id } = await params
  await prisma.biSource.delete({ where: { id } })
  invalidateCache(id).catch(() => {}) // cache stale setelah source dihapus
  return NextResponse.json({ ok: true })
}
