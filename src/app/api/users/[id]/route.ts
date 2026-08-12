import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { updateUserSchema } from "@/validation/user"
import { requireAdmin, forbidden, parseBody } from "@/lib/api"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const { id } = await params
  const { data, error } = await parseBody(req, updateUserSchema)
  if (error) return error

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
  const session = await requireAdmin()
  if (!session) return forbidden()

  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
