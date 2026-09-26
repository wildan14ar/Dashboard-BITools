import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { RoleSchema } from "@/validations"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({
    permissions: ["roles:update"],
  })
  if (error) return error
  const userId = session?.user?.id
  const { id: roleId } = await params

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        params: z.object({
          id: z.string().min(1),
        }),
        body: RoleSchema,
      }),
      request,
      params,
    )
    if (validation instanceof NextResponse) return validation

    const { id } = validation.params
    const { name, description, permissions } = validation.body

    const updateData: {
      name?: string
      description?: string
    } = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (permissions !== undefined) {
      const catalog = await prisma.rolePermission.findMany({
        where: { action: { in: permissions }, roleId: null },
        select: { action: true, label: true, description: true },
      })

      // Ganti total set permission milik role ini (salinan baris, bukan assign katalog)
      await prisma.rolePermission.deleteMany({ where: { roleId: id } })
      if (catalog.length > 0) {
        await prisma.rolePermission.createMany({
          data: catalog.map((p) => ({
            action: p.action,
            label: p.label,
            description: p.description,
            roleId: id,
          })),
        })
      }
    }

    const updated = await prisma.role
      .update({
        where: { id },
        data: updateData,
      })
      .catch(() => null)
    if (!updated) {
      return ResponseHandler.notFound("Role tidak ditemukan")
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    })
    if (!role) {
      return ResponseHandler.notFound("Role tidak ditemukan")
    }

    const roleFormatted = {
      ...role,
      permissions: role.permissions.map((p) => p.action),
    }

    await logActivity(userId, "UPDATE", "Role", id, { name })
    return ResponseHandler.success("Role updated", roleFormatted)
  } catch (error) {
    await logActivity(userId, "ERROR", "Role", roleId, {
      error: String(error),
    })
    return ResponseHandler.internalError("Failed to update role", error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth({
    permissions: ["roles:delete"],
  })
  if (error) return error
  const userId = session?.user?.id
  const { id: deleteId } = await params

  try {
    const validation = await RequestHandler.validateRequest(
      z.object({
        params: z.object({
          id: z.string().min(1),
        }),
      }),
      request,
      params,
    )
    if (validation instanceof NextResponse) return validation

    const { id } = validation.params
    await prisma.role.delete({
      where: { id },
    })

    await logActivity(userId, "DELETE", "Role", id, {})
    return ResponseHandler.success("Role deleted successfully")
  } catch (error) {
    await logActivity(userId, "ERROR", "Role", deleteId, {
      error: String(error),
    })
    return ResponseHandler.internalError("Failed to delete role", error)
  }
}
