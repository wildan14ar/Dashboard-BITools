import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { invalidateCache } from "@/lib/engine"
import { sourceSchema } from "@/validation/source"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { id } = await params
  const source = await prisma.biSource.findUnique({ where: { id } })
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(source)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = sourceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const source = await prisma.biSource.update({
    where: { id },
    data: { name: parsed.data.name, type: parsed.data.type, config: parsed.data.config as object },
  })
  invalidateCache(id).catch(() => {}) // cache stale setelah config berubah
  return NextResponse.json(source)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { id } = await params
  await prisma.biSource.delete({ where: { id } })
  invalidateCache(id).catch(() => {}) // cache stale setelah source dihapus
  return NextResponse.json({ ok: true })
}
