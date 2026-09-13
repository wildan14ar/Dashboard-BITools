import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestHandler } from "@/middlewares/request-handler"
import { updateUserSchema } from "@/validation/user"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const validated = await RequestHandler.validateRequest(z.object({ body: updateUserSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

  const { password, ...rest } = data
  const updateData: Record<string, unknown> = { ...rest }
  if (password) updateData.passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, userName: true, fullName: true, email: true, isSuperAdmin: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
