import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sourceSchema } from "@/validation/source"
import { requireAdmin, forbidden, parseBody } from "@/lib/api"

export async function GET() {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const sources = await prisma.biSource.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(sources)
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const { data, error } = await parseBody(req, sourceSchema)
  if (error) return error

  const source = await prisma.biSource.create({
    data: { name: data.name, type: data.type, config: data.config as object },
  })
  return NextResponse.json(source, { status: 201 })
}
