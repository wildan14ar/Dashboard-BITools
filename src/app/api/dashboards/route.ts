import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { dashboardSchema } from "@/validation/dashboard"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dashboards = await prisma.biDashboard.findMany({
    include: { _count: { select: { panels: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(dashboards)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = dashboardSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const dashboard = await prisma.biDashboard.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      tags: parsed.data.tags ?? [],
      isPublic: parsed.data.isPublic ?? false,
      userId: session.user.id,
    },
  })
  return NextResponse.json(dashboard, { status: 201 })
}
