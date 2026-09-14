// In-memory fixed-window rate limiter untuk route berat (dataset/source run).
// NOTE: per-process Map — akurat untuk deploy single-instance (postur sama
// seperti cache permission di middlewares/rbac.ts). Untuk multi-replica,
// pindahkan bucket ke Redis.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const MAX_BUCKETS = 10_000

function sweep(now: number) {
  if (buckets.size <= MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
    if (buckets.size <= MAX_BUCKETS) break
  }
}

export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  bucket.count += 1
  return { ok: true, retryAfterSec: 0 }
}
