import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, unauthorized } from "@/lib/api"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id } = await params
  const body = await req.json()
  const dashboard = await prisma.biDashboard.update({
    where: { id },
    data: { isPublic: body.isPublic },
  })
  return NextResponse.json(dashboard)
}
