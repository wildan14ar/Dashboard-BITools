import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
  const body = await req.json()
  const parsed = dashboardSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const dashboard = await prisma.biDashboard.update({
    where: { id },
    data: { name: parsed.data.name, description: parsed.data.description, tags: parsed.data.tags ?? [], isPublic: parsed.data.isPublic },
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
