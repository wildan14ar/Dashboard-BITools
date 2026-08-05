import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sourceSchema } from "@/validation/source"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const sources = await prisma.biSource.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(sources)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const body = await req.json()
  const parsed = sourceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const source = await prisma.biSource.create({
    data: { name: parsed.data.name, type: parsed.data.type, config: (parsed.data.config ?? {}) as object },
  })
  return NextResponse.json(source, { status: 201 })
}
