import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, unauthorized } from "@/lib/api"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id: dashboardId } = await params
  const { userId, role } = await req.json()

  const member = await prisma.biDashboardMember.create({
    data: { dashboardId, userId, role: role ?? "VIEWER" },
    include: { user: { select: { id: true, userName: true, email: true } } },
  })
  return NextResponse.json(member, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id: dashboardId } = await params
  const { userId } = await req.json()

  await prisma.biDashboardMember.deleteMany({
    where: { dashboardId, userId },
  })
  return NextResponse.json({ ok: true })
}
