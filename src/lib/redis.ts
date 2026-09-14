import Redis from "ioredis"

let client: Redis | null = null
let unavailable = false

/** Redis client bersama, atau null bila REDIS_URL tak diset / tak terjangkau. */
export function getRedis(): Redis | null {
  if (unavailable) return null
  const url = process.env.REDIS_URL
  if (!url) return null
  if (!client) {
    client = new Redis(url, {
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      retryStrategy: () => null, // jangan retry loop; fallback ke memori
    })
    client.on("error", () => {
      unavailable = true
    })
  }
  return client
}

/** Reset untuk testing. */
export function _resetRedisForTests() {
  client?.disconnect()
  client = null
  unavailable = false
}

export function redisKey(...parts: string[]): string {
  return ["bi", ...parts].join(":")
}
