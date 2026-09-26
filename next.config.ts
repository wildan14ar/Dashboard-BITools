import bundleAnalyzer from "@next/bundle-analyzer"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

const isProd = process.env.NODE_ENV === "production"

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Postman: selalu HTTPS di production (browser mengabaikan di http/localhost).
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
  // CSP longgar-tapi-aman: Next butuh 'unsafe-inline' (tanpa nonce),
  // GA/GTM opsional di-allowlist eksplisit. Hanya production agar HMR dev
  // (eval) tidak pecah. Ketatkan lagi sesuai kebutuhan (mis. nonce script).
  ...(isProd
    ? [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
          ].join("; "),
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Prisma generated di prisma/generated/client + driver adapter pg
  // mengandung native module — wajib external agar server tidak mencoba bundle.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.localtunnel.me"],
  compiler: {
    // Strip console.* di production (kecuali error) untuk bundle lebih kecil
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "@tanstack/react-query",
      "react-hook-form",
      "@hookform/resolvers",
      "sonner",
    ],
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon.svg",
        permanent: true,
      },
      // Next.js serve manifest.ts di /manifest.webmanifest;
      // redirect agar request lama ke /manifest.json tetap jalan.
      {
        source: "/manifest.json",
        destination: "/manifest.webmanifest",
        permanent: true,
      },
      // Folder admin dijadikan route group (dashboard/(admin)) sehingga segmen
      // URL /admin hilang — redirect agar bookmark lama tetap jalan.
      {
        source: "/dashboard/admin",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/dashboard/admin/:path*",
        destination: "/dashboard/:path*",
        permanent: true,
      },
    ]
  },
  // Tanpa versioning: satu path stabil /api/* untuk semua klien.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
  images: {
    dangerouslyAllowSVG: true,
    formats: ["image/avif", "image/webp"],
    // Platform/social icons & avatars can be external URLs stored in the DB
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
}

export default withNextIntl(withBundleAnalyzer(nextConfig))
