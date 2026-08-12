import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { dashboardSchema } from "@/validation/dashboard"
import { requireAuth, unauthorized, parseBody } from "@/lib/api"

export async function GET() {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const dashboards = await prisma.biDashboard.findMany({
    include: { _count: { select: { panels: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(dashboards)
}

export async function POST(req: Request) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { data, error } = await parseBody(req, dashboardSchema)
  if (error) return error

  const dashboard = await prisma.biDashboard.create({
    data: {
      name: data.name,
      description: data.description,
      tags: data.tags ?? [],
      isPublic: data.isPublic ?? false,
      userId: session.user.id,
    },
  })
  return NextResponse.json(dashboard, { status: 201 })
}
