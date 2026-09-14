import { headers } from "next/headers"
import { NextResponse } from "next/server"
import prisma from "@/config/prisma"
import { auth } from "@/lib/auth"
import { getRedis, redisKey } from "@/lib/redis"

type BetterAuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type AuthSession = Pick<BetterAuthSession, "user" | "session">

export type CachedPermissions = {
  roles: string[]
  isSuperAdmin: boolean
  permissions: string[]
  fetchedAt: number
}

const CACHE_TTL_MS = 30_000
const CACHE_TTL_SEC = 30

// module-level Map, fallback bila Redis tak tersedia (single-instance).
const fallbackCache = new Map<string, CachedPermissions & { userId: string }>()

async function readSharedCache(userId: string): Promise<CachedPermissions | null> {
  const fallback = fallbackCache.get(userId)
  if (fallback && Date.now() - fallback.fetchedAt < CACHE_TTL_MS) return fallback
  try {
    const redis = getRedis()
    if (!redis) return fallback && Date.now() - fallback.fetchedAt < CACHE_TTL_MS ? fallback : null
    const raw = await redis.get(redisKey("perms", userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPermissions
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return fallback && Date.now() - fallback.fetchedAt < CACHE_TTL_MS ? fallback : null
  }
}

async function writeSharedCache(userId: string, result: CachedPermissions) {
  fallbackCache.set(userId, { ...result, userId })
  try {
    const redis = getRedis()
    if (redis)
      await redis.set(redisKey("perms", userId), JSON.stringify(result), "EX", CACHE_TTL_SEC)
  } catch {
    // Redis opsional; fallback memori sudah terisi.
  }
}

function authErr(body: object, status: number): { error: NextResponse; session: AuthSession } {
  return {
    error: NextResponse.json(body, { status }),
    session: {} as AuthSession,
  }
}

export async function fetchAndCachePermissions(userId: string): Promise<CachedPermissions | null> {
  const shared = await readSharedCache(userId)
  if (shared) return shared

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
  await writeSharedCache(userId, result)
  return result
}

export async function invalidatePermissionCache(userId?: string) {
  if (userId) {
    fallbackCache.delete(userId)
    try {
      const redis = getRedis()
      if (redis) await redis.del(redisKey("perms", userId))
    } catch {
      // abaikan; TTL 30 detik membersihkan sendiri
    }
  } else {
    fallbackCache.clear()
  }
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
