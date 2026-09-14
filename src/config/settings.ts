export const settings = {
  appName: "BI Dashboard",
  DATABASE_URL: process.env.DATABASE_URL!,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "",
  NODE_ENV: process.env.NODE_ENV || "development",

  betterAuth: {
    trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },

  /** Defaults for ad-hoc source queries (admin SQL runner). */
  query: {
    maxRows: 200,
    timeoutSec: 30,
  },

  engine: {
    host: process.env.QUERY_ENGINE_HOST || "localhost:50051",
    port: Number(process.env.QUERY_ENGINE_PORT || "50051"),
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    ttlSec: Number(process.env.QUERY_CACHE_TTL_SEC || "300"),
    staleWindowSec: Number(process.env.QUERY_CACHE_STALE_WINDOW_SEC || "600"),
  },
} as const
