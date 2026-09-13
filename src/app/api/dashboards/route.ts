import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestHandler } from "@/middlewares/request-handler"
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

  const validated = await RequestHandler.validateRequest(z.object({ body: dashboardSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

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
