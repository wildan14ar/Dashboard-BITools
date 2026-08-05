import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { panelReorderSchema } from "@/validation/dashboard"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dashboardId } = await params
  const body = await req.json()
  const parsed = panelReorderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await prisma.$transaction(
    parsed.data.map((p) =>
      prisma.biPanel.update({ where: { id: p.id }, data: { x: p.x, y: p.y, w: p.w, h: p.h } })
    )
  )
  return NextResponse.json({ ok: true })
}
