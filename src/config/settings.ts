export const settings = {
  DATABASE_URL: process.env.DATABASE_URL!,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  NODE_ENV: process.env.NODE_ENV || "development",

  betterAuth: {
    trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },

  oauth: {
    google: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true",
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH === "true",
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },

  // Object storage (S3-compatible). Kosong = mode fallback simpan di DB.
  s3: {
    endpoint: process.env.S3_ENDPOINT || "",
    region: process.env.S3_REGION || "auto",
    bucket: process.env.S3_BUCKET || "",
    accessKey: process.env.S3_ACCESS_KEY || "",
    secretKey: process.env.S3_SECRET_KEY || "",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  },

  storage: {
    // Batas ukuran upload global (bytes). Default 10 MB.
    maxFileSize: Number(process.env.ATTACHMENTS_MAX_SIZE || 10 * 1024 * 1024),
  },

  query: {
    // Batas default eksekusi query engine.
    maxRows: Number(process.env.QUERY_MAX_ROWS || 1000),
    timeoutSec: Number(process.env.QUERY_TIMEOUT_SEC || 30),
  },

  uploads: {
    // Direktori data untuk chunked upload source file. Default ./data.
    dir: process.env.DATA_DIR || `${process.cwd()}/data`,
    allowedExts: [".csv", ".xlsx"],
    // Batas ukuran satu file upload (bytes). Default 10 MB.
    maxBytes: Number(process.env.UPLOADS_MAX_BYTES || 10 * 1024 * 1024),
  },
}
