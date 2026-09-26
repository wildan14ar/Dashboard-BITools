import { randomBytes } from "node:crypto"
import prisma from "@/config/prisma"
import { hashPassword, verifyPassword } from "@/lib/password"

/**
 * API Key server-to-server.
 * Format: `sk_<64 hex>` — hanya ditampilkan SEKALI saat create.
 * (Format lama `pk_...` tetap diterima untuk backward compat.)
 * Verifikasi: argon2id(salt + rawKey) dibandingkan dengan keyHash.
 * Lookup via prefix (8 char pertama token) karena hash tidak searchable.
 */

export const API_KEY_HEADER = "X-API-Key"
const PREFIX_LEN = 8

export function generateRawKey(): { key: string; prefix: string } {
  const token = randomBytes(32).toString("hex")
  return { key: `sk_${token}`, prefix: token.slice(0, PREFIX_LEN) }
}

function stripScheme(rawKey: string): string | null {
  if (rawKey.startsWith("sk_")) return rawKey.slice(3)
  if (rawKey.startsWith("pk_")) return rawKey.slice(3)
  return null
}

export function generateSalt(): string {
  return randomBytes(16).toString("hex")
}

function salted(salt: string, rawKey: string): string {
  return `${salt}:${rawKey}`
}

export async function hashApiKey(salt: string, rawKey: string): Promise<string> {
  return hashPassword(salted(salt, rawKey))
}

export interface VerifiedKey {
  id: string
  userId: string
  name: string
}

/** Validasi X-API-Key: aktif, tak expired, milik user aktif. */
export async function verifyApiKey(rawKey: string): Promise<VerifiedKey | null> {
  const token = stripScheme(rawKey)
  if (!token || token.length < PREFIX_LEN) return null
  const prefix = token.slice(0, PREFIX_LEN)

  const candidates = await prisma.apiKey.findMany({
    where: { prefix, isActive: true, deletedAt: null },
    include: { user: { select: { id: true, isActive: true, deletedAt: true } } },
  })

  for (const cand of candidates) {
    if (cand.expiresAt && cand.expiresAt.getTime() < Date.now()) continue
    if (!cand.user.isActive || cand.user.deletedAt) continue
    const ok = await verifyPassword(salted(cand.keySalt, rawKey), cand.keyHash).catch(() => false)
    if (!ok) continue
    return { id: cand.id, userId: cand.userId, name: cand.name }
  }
  return null
}

/** Catat pemakaian (fire-and-forget oleh caller). */
export async function touchApiKey(id: string): Promise<void> {
  await prisma.apiKey
    .update({
      where: { id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    })
    .catch(() => {})
}
