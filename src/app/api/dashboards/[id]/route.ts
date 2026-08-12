import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dashboardSchema } from "@/validation/dashboard"
import { requireAuth, unauthorized, parseBody } from "@/lib/api"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id } = await params
  const dashboard = await prisma.biDashboard.findUnique({
    where: { id },
    include: { panels: { orderBy: { createdAt: "asc" } }, filters: { orderBy: { position: "asc" } } },
  })
  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(dashboard)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id } = await params
  const { data, error } = await parseBody(req, dashboardSchema)
  if (error) return error

  const dashboard = await prisma.biDashboard.update({
    where: { id },
    data: { name: data.name, description: data.description, tags: data.tags ?? [], isPublic: data.isPublic },
  })
  return NextResponse.json(dashboard)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id } = await params
  await prisma.biDashboard.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
