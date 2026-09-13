import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestHandler } from "@/middlewares/request-handler"
import { dashboardSchema } from "@/validation/dashboard"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const dashboard = await prisma.biDashboard.findUnique({
    where: { id },
    include: { panels: { orderBy: { createdAt: "asc" } }, filters: { orderBy: { position: "asc" } } },
  })
  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(dashboard)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const validated = await RequestHandler.validateRequest(z.object({ body: dashboardSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

  const dashboard = await prisma.biDashboard.update({
    where: { id },
    data: { name: data.name, description: data.description, tags: data.tags ?? [], isPublic: data.isPublic },
  })
  return NextResponse.json(dashboard)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.biDashboard.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
