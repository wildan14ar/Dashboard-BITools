import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { panelSchema } from "@/validation/dashboard"
import { requireAuth, unauthorized, parseBody } from "@/lib/api"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id: dashboardId } = await params
  const { data, error } = await parseBody(req, panelSchema)
  if (error) return error

  const panel = await prisma.biPanel.create({
    data: {
      ...data,
      dashboardId,
      config: (data.config ?? {}) as object,
    },
  })
  return NextResponse.json(panel, { status: 201 })
}
