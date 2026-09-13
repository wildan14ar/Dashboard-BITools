export const settings = {
  appName: "BI Dashboard",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  /** Defaults for ad-hoc source queries (admin SQL runner). */
  query: {
    maxRows: 200,
    timeoutSec: 30,
  },
} as const
