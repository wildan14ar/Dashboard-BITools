import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; filterId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { filterId } = await params
  await prisma.biFilter.delete({ where: { id: filterId } })
  return NextResponse.json({ ok: true })
}
