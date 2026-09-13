import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestHandler } from "@/middlewares/request-handler"
import { createUserSchema } from "@/validation/user"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const users = await prisma.user.findMany({
    select: { id: true, userName: true, fullName: true, email: true, isSuperAdmin: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const validated = await RequestHandler.validateRequest(z.object({ body: createUserSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

  const { password, ...rest } = data
  const existing = await prisma.user.findUnique({ where: { userName: rest.userName } })
  if (existing) return NextResponse.json({ error: "Username taken" }, { status: 409 })

  const user = await prisma.user.create({
    data: { ...rest, passwordHash: await bcrypt.hash(password, 10) },
    select: { id: true, userName: true, fullName: true, email: true, isSuperAdmin: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
