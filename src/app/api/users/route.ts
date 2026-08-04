import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createUserSchema } from "@/validation/user"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const users = await prisma.user.findMany({
    select: { id: true, userName: true, fullName: true, email: true, isSuperAdmin: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { password, ...rest } = parsed.data
  const existing = await prisma.user.findUnique({ where: { userName: rest.userName } })
  if (existing) return NextResponse.json({ error: "Username taken" }, { status: 409 })

  const user = await prisma.user.create({
    data: { ...rest, passwordHash: await bcrypt.hash(password, 10) },
    select: { id: true, userName: true, fullName: true, email: true, isSuperAdmin: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
