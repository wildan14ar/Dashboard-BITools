import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { panelSchema } from "@/validation/dashboard"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dashboardId } = await params
  const body = await req.json()
  const parsed = panelSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const panel = await prisma.biPanel.create({
    data: {
      ...parsed.data,
      dashboardId,
      config: (parsed.data.config ?? {}) as object,
    },
  })
  return NextResponse.json(panel, { status: 201 })
}
