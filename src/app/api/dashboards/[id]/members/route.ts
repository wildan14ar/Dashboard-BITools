import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dashboardId } = await params
  const { userId, role } = await req.json()

  const member = await prisma.biDashboardMember.create({
    data: { dashboardId, userId, role: role ?? "VIEWER" },
    include: { user: { select: { id: true, userName: true, email: true } } },
  })
  return NextResponse.json(member, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dashboardId } = await params
  const { userId } = await req.json()

  await prisma.biDashboardMember.deleteMany({
    where: { dashboardId, userId },
  })
  return NextResponse.json({ ok: true })
}
