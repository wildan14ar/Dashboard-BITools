import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { createUserSchema } from "@/validation/user"
import { requireAdmin, forbidden, parseBody } from "@/lib/api"

export async function GET() {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const users = await prisma.user.findMany({
    select: { id: true, userName: true, fullName: true, email: true, isSuperAdmin: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const { data, error } = await parseBody(req, createUserSchema)
  if (error) return error

  const { password, ...rest } = data
  const existing = await prisma.user.findUnique({ where: { userName: rest.userName } })
  if (existing) return NextResponse.json({ error: "Username taken" }, { status: 409 })

  const user = await prisma.user.create({
    data: { ...rest, passwordHash: await bcrypt.hash(password, 10) },
    select: { id: true, userName: true, fullName: true, email: true, isSuperAdmin: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
