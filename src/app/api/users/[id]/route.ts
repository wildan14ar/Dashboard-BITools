import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateUserSchema } from "@/validation/user"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { password, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (password) data.passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, userName: true, fullName: true, email: true, isSuperAdmin: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
