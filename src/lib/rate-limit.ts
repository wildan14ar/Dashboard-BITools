import { checkRateLimit } from "@/middlewares/rate-limit"

// Rate-limit khusus endpoint run (query engine) — lebih ketat dari
// rate-limit global API di proxy. In-memory, single-instance.
const RUN_LIMIT = Number(process.env.RUN_RATE_LIMIT_MAX ?? 30) || 30
const RUN_WINDOW_MS = Number(process.env.RUN_RATE_LIMIT_WINDOW_MS ?? 60_000) || 60_000

export async function rateLimit(key: string) {
  const r = checkRateLimit(key, RUN_LIMIT, RUN_WINDOW_MS)
  return { ok: r.allowed, retryAfterSec: r.retryAfter }
}
