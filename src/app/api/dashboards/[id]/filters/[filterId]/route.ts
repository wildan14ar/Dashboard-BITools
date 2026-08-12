import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, unauthorized } from "@/lib/api"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; filterId: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { filterId } = await params
  const body = await req.json()
  const filter = await prisma.biFilter.update({
    where: { id: filterId },
    data: {
      name: body.name, label: body.label, type: body.type,
      config: (body.config ?? {}) as object, position: body.position,
    },
  })
  return NextResponse.json(filter)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; filterId: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { filterId } = await params
  await prisma.biFilter.delete({ where: { id: filterId } })
  return NextResponse.json({ ok: true })
}
