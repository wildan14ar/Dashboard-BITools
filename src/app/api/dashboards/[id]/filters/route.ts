import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { filterSchema } from "@/validation/filter"
import { requireAuth, unauthorized, parseBody } from "@/lib/api"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const { id: dashboardId } = await params
  const { data, error } = await parseBody(req, filterSchema)
  if (error) return error

  const filter = await prisma.biFilter.create({
    data: { ...data, dashboardId, config: (data.config ?? {}) as object },
  })
  return NextResponse.json(filter, { status: 201 })
}
