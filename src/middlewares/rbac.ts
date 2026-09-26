import { headers } from "next/headers"
import { NextResponse } from "next/server"
import prisma from "@/config/prisma"
import { API_KEY_HEADER, touchApiKey, verifyApiKey } from "./apikeys"
import { auth } from "./auth"

type BetterAuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type AuthSession = Pick<BetterAuthSession, "user" | "session">

export type CachedPermissions = {
  roles: string[]
  isSuperAdmin: boolean
  permissions: string[]
  fetchedAt: number
}

const CACHE_TTL_MS = 30_000

// ponytail: module-level Map, per-process cache; good enough for single-instance deploys
const fallbackCache = new Map<string, CachedPermissions & { userId: string }>()

function authErr(body: object, status: number): { error: NextResponse; session: AuthSession } {
  return {
    error: NextResponse.json(body, { status }),
    // ponytail: caller always checks error first, session never accessed
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

export async function requireAuth(options?: {
  permissions?: string[]
}): Promise<{ error: NextResponse | null; session: AuthSession }> {
  const hdrs = await headers()
  const session = await auth.api.getSession({ headers: hdrs })

  if (!session) {
    // Fallback server-to-server: X-API-Key (scope-based, bukan role).
    const rawKey = hdrs.get(API_KEY_HEADER)
    if (rawKey) return requireApiKey(rawKey, options?.permissions ?? [])
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

/**
 * Auth via X-API-Key. Hak akses = permission user pemilik saat ini
 * (superadmin bypass). Session disintesis tanpa cookie — caller yang butuh
 * session cookie (ganti password, sesi saat ini) tidak didukung untuk key.
 */
async function requireApiKey(
  rawKey: string,
  required: string[],
): Promise<{ error: NextResponse | null; session: AuthSession }> {
  const verified = await verifyApiKey(rawKey)
  if (!verified) {
    return authErr({ error: "API key tidak valid atau kedaluwarsa" }, 401)
  }

  const record = await prisma.apiKey.findUnique({
    where: { id: verified.id },
    select: { isRestfull: true },
  })
  if (!record?.isRestfull) {
    return authErr({ error: "API key ini tidak diizinkan untuk REST" }, 403)
  }

  // Hak key mengikuti pemiliknya — bukan scope per-key.
  const cached = await fetchAndCachePermissions(verified.userId)
  if (!cached) {
    return authErr({ error: "Akun pemilik key tidak aktif" }, 401)
  }
  if (!cached.isSuperAdmin && required.length > 0) {
    const allowed = required.some((p) => cached.permissions.includes(p))
    if (!allowed) {
      return authErr({ error: "Tidak memiliki izin akses" }, 403)
    }
  }

  // Catat pemakaian tanpa menghambat respons.
  void touchApiKey(verified.id)

  const session = {
    user: { id: verified.userId },
    session: null,
    apiKey: { id: verified.id },
  } as unknown as AuthSession
  return { error: null, session }
}
