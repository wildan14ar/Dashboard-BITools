import { beforeEach, expect, test } from "bun:test"
import { _resetRateLimitForTests, rateLimit } from "@/lib/rate-limit"
import { _resetRedisForTests, getRedis } from "@/lib/redis"

beforeEach(() => {
  delete process.env.REDIS_URL
  _resetRedisForTests()
  _resetRateLimitForTests()
})

test("getRedis returns null without REDIS_URL", () => {
  expect(getRedis()).toBeNull()
})

test("allows up to limit then blocks with retryAfter", async () => {
  for (let i = 0; i < 3; i++) {
    expect((await rateLimit("k", 3, 60_000)).ok).toBe(true)
  }
  const blocked = await rateLimit("k", 3, 60_000)
  expect(blocked.ok).toBe(false)
  expect(blocked.retryAfterSec).toBeGreaterThan(0)
})

test("window resets after expiry", async () => {
  expect((await rateLimit("w", 1, 30)).ok).toBe(true)
  expect((await rateLimit("w", 1, 30)).ok).toBe(false)
  await new Promise((r) => setTimeout(r, 50))
  expect((await rateLimit("w", 1, 30)).ok).toBe(true)
})

test("isolates keys", async () => {
  expect((await rateLimit("a", 1, 60_000)).ok).toBe(true)
  expect((await rateLimit("b", 1, 60_000)).ok).toBe(true)
  expect((await rateLimit("a", 1, 60_000)).ok).toBe(false)
})
