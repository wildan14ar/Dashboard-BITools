import type { NextConfig } from "next"

function parseOrigins(...values: (string | undefined)[]): string[] {
  const out = new Set<string>()
  for (const value of values) {
    for (const part of (value ?? "").split(",")) {
      const origin = part.trim()
      if (origin) out.add(origin)
    }
  }
  return [...out]
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Dev tunnel (cloudflared/ngrok) memakai hostname acak per run —
  // izinkan via env agar HMR + chunks tidak diblokir. Hanya berlaku di dev.
  allowedDevOrigins: parseOrigins(
    process.env.ALLOWED_DEV_ORIGINS,
    process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    "*.trycloudflare.com,*.ngrok-free.app,*.ngrok.io",
  ),
}

export default nextConfig
