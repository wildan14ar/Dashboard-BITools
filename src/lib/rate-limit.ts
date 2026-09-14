import { getRedis, redisKey } from "@/lib/redis"

// Fixed-window rate limiter untuk route berat (dataset/source run).
// Backend utama Redis (dibagi antar replika); fallback ke memori bila
// Redis tak tersedia. Selalu fail-open agar limiter tak memblokir traffic sah.

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

function memoryCheck(key: string, limit: number, windowMs: number) {
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

async function redisCheck(key: string, limit: number, windowMs: number) {
  const redis = getRedis()
  if (!redis) return null
  const rkey = redisKey("ratelimit", key)
  // INCR + PEXPIRE bukan atomik penuh, tapi cukup untuk rate limiting.
  const count = await redis.incr(rkey)
  if (count === 1) await redis.pexpire(rkey, windowMs)
  const ttl = await redis.pttl(rkey)
  if (count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(ttl / 1000)) }
  }
  return { ok: true, retryAfterSec: 0 }
}

export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  try {
    const res = await redisCheck(key, limit, windowMs)
    if (res) return res
  } catch {
    // Redis gagal → fallback memori (fail-open).
  }
  return memoryCheck(key, limit, windowMs)
}

/** Reset bucket memori untuk testing. */
export function _resetRateLimitForTests() {
  buckets.clear()
}
