import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestHandler } from "@/middlewares/request-handler"
import { panelReorderSchema } from "@/validation/dashboard"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dashboardId } = await params
  const validated = await RequestHandler.validateRequest(z.object({ body: panelReorderSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

  await prisma.$transaction(
    data.map((p) =>
      prisma.biPanel.update({ where: { id: p.id }, data: { x: p.x, y: p.y, w: p.w, h: p.h } })
    )
  )
  return NextResponse.json({ ok: true })
}
