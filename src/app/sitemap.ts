import type { MetadataRoute } from "next"
import { settings } from "@/config/settings"

// Tidak ada lagi halaman publik ber-locale — sitemap hanya memakai
// URL kanonis tanpa prefix. Root "/" adalah dashboard privat (noindex
// via layout); entri dipertahankan agar konsistensi SEO.
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = settings.BETTER_AUTH_URL

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ]
}
