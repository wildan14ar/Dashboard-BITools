import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, unauthorized } from "@/lib/api"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; panelId: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { panelId } = await params
  const body = await req.json()

  const panel = await prisma.biPanel.update({
    where: { id: panelId },
    data: {
      title: body.title,
      chartType: body.chartType,
      config: body.config as object | undefined,
      dataSetId: body.dataSetId,
      x: body.x, y: body.y, w: body.w, h: body.h,
    },
  })
  return NextResponse.json(panel)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; panelId: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { panelId } = await params
  await prisma.biPanel.delete({ where: { id: panelId } })
  return NextResponse.json({ ok: true })
}
