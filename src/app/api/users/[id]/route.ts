import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { setCredentialPassword } from "@/lib/credentials"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { UpdateUserSchema } from "@/validations"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["users:admin"] })
  if (error) return error

  try {
    const { id } = await params
    const validated = await RequestHandler.validateRequest(
      z.object({ body: UpdateUserSchema }),
      req,
    )
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    const { password, roleIds, ...rest } = data

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(roleIds
          ? {
              userRoles: {
                deleteMany: {},
                create: roleIds.map((roleId: string) => ({ role: { connect: { id: roleId } } })),
              },
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        fullname: true,
        email: true,
        avatar: true,
        quote: true,
        isActive: true,
        isPublic: true,
        isSuperAdmin: true,
      },
    })

    if (password) await setCredentialPassword(id, password)

    await logActivity(session.user.id, "UPDATE", "User", user.id, { email: user.email })
    return ResponseHandler.success("User berhasil diperbarui", user)
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "User", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal memperbarui user", err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["users:admin"] })
  if (error) return error

  try {
    const { id } = await params
    await prisma.user.delete({ where: { id } })

    await logActivity(session.user.id, "DELETE", "User", id)
    return ResponseHandler.success("User berhasil dihapus", { ok: true })
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "User", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal menghapus user", err)
  }
}
