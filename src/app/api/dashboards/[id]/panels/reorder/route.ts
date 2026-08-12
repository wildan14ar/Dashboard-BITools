import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { panelReorderSchema } from "@/validation/dashboard"
import { requireAuth, unauthorized, parseBody } from "@/lib/api"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id: dashboardId } = await params
  const { data, error } = await parseBody(req, panelReorderSchema)
  if (error) return error

  await prisma.$transaction(
    data.map((p) =>
      prisma.biPanel.update({ where: { id: p.id }, data: { x: p.x, y: p.y, w: p.w, h: p.h } })
    )
  )
  return NextResponse.json({ ok: true })
}
