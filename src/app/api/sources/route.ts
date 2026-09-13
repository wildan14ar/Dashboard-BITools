import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestHandler } from "@/middlewares/request-handler"
import { sourceSchema } from "@/validation/source"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const sources = await prisma.biSource.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(sources)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const validated = await RequestHandler.validateRequest(z.object({ body: sourceSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

  const source = await prisma.biSource.create({
    data: { name: data.name, type: data.type, config: data.config as object },
  })
  return NextResponse.json(source, { status: 201 })
}
