import { NextResponse } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { requireAuth } from "@/middlewares/rbac"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, session } = await requireAuth()
    if (error || !session)
      return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const account = await prisma.account.findUnique({ where: { id } })
    if (!account) {
      return NextResponse.json({ error: "Social account not found" }, { status: 404 })
    }
    if (account.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (account.providerId === "credential") {
      return NextResponse.json({ error: "Tidak dapat menghapus akun credential" }, { status: 400 })
    }

    await prisma.account.delete({ where: { id } })

    await logActivity(session.user.id, "DELETE", "SocialAccount", id)

    return NextResponse.json({
      success: true,
      message: "Social account unlinked",
    })
  } catch (err) {
    await logActivity("system", "ERROR", "SocialAccount", "unknown", {
      error: String(err),
    })
    return NextResponse.json({ error: "Failed to unlink social account" }, { status: 500 })
  }
}
