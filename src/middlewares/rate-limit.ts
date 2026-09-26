/**
 * Rate limiter in-memory untuk Edge/proxy (fixed-window counter).
 * Cukup untuk single-instance. Untuk multi-instance/prod gunakan
 * Redis/Upstash (batas via env RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS).
 */
interface Bucket {
  count: number
  reset: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  /** Epoch detik saat window reset (untuk header X-RateLimit-Reset). */
  reset: number
  retryAfter: number
}

export function checkRateLimit(
  key: string,
  limit = 100,
  windowMs = 60_000,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.reset) {
    const reset = now + windowMs
    buckets.set(key, { count: 1, reset })
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(reset / 1000),
      retryAfter: 0,
    }
  }

  bucket.count += 1
  const remaining = Math.max(limit - bucket.count, 0)
  const retryAfter = Math.max(Math.ceil((bucket.reset - now) / 1000), 1)

  // Bersihkan bucket tetangga sesekali agar Map tidak bocor memori.
  if (buckets.size > 10_000 && Math.random() < 0.01) {
    for (const [k, v] of buckets) {
      if (now >= v.reset) buckets.delete(k)
    }
  }

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    reset: Math.ceil(bucket.reset / 1000),
    retryAfter,
  }
}
