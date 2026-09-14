import { headers } from "next/headers"
import { NextResponse } from "next/server"
import prisma from "@/config/prisma"
import { auth } from "@/lib/auth"

type BetterAuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type AuthSession = Pick<BetterAuthSession, "user" | "session">

export type CachedPermissions = {
  roles: string[]
  isSuperAdmin: boolean
  permissions: string[]
  fetchedAt: number
}

const CACHE_TTL_MS = 30_000

// module-level Map, per-process cache; good enough for single-instance deploys
const fallbackCache = new Map<string, CachedPermissions & { userId: string }>()

function authErr(body: object, status: number): { error: NextResponse; session: AuthSession } {
  return {
    error: NextResponse.json(body, { status }),
    session: {} as AuthSession,
  }
}

export async function fetchAndCachePermissions(userId: string): Promise<CachedPermissions | null> {
  const entry = fallbackCache.get(userId)
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
    return entry
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: { permissions: true },
          },
        },
      },
    },
  })

  if (!user?.isActive || user.deletedAt) return null

  const perms = Array.from(
    new Set(user.userRoles.flatMap((ur) => ur.role.permissions.map((p) => p.action))),
  )

  const result: CachedPermissions = {
    roles: user.userRoles.map((ur) => ur.role.name),
    isSuperAdmin: user.isSuperAdmin,
    permissions: perms,
    fetchedAt: Date.now(),
  }

  fallbackCache.set(userId, { ...result, userId })
  return result
}

export function invalidatePermissionCache(userId?: string) {
  if (userId) fallbackCache.delete(userId)
  else fallbackCache.clear()
}

export async function requireAuth(options?: {
  permissions?: string[]
}): Promise<{ error: NextResponse | null; session: AuthSession }> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return authErr({ error: "Tidak terautentikasi" }, 401)
  }

  const cached = await fetchAndCachePermissions(session.user.id)
  if (!cached) {
    return authErr({ error: "Akun tidak ditemukan atau tidak aktif" }, 401)
  }

  if (!options?.permissions || options.permissions.length === 0) {
    return { error: null, session }
  }

  if (cached.isSuperAdmin) {
    return { error: null, session }
  }

  const hasAnyPermission = options.permissions.some((perm) => cached.permissions.includes(perm))

  if (!hasAnyPermission) {
    return authErr({ error: "Tidak memiliki izin akses" }, 403)
  }

  return { error: null, session }
}
