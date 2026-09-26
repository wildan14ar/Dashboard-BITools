import { NextResponse } from "next/server"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import { requireAuth } from "@/middlewares/rbac"

export async function GET() {
  try {
    const { error, session } = await requireAuth()
    if (error || !session)
      return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id, NOT: { providerId: "credential" } },
      select: {
        id: true,
        providerId: true,
        accountId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      success: true,
      data: accounts.map((account) => ({
        id: account.id,
        provider: account.providerId.toUpperCase(),
        providerAccountId: account.accountId,
        createdAt: account.createdAt,
      })),
    })
  } catch (err) {
    await logActivity("system", "ERROR", "SocialAccount", undefined, {
      error: String(err),
    })
    return NextResponse.json({ error: "Failed to fetch social accounts" }, { status: 500 })
  }
}
