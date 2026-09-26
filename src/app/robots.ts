import type { MetadataRoute } from "next"
import { settings } from "@/config/settings"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = settings.BETTER_AUTH_URL

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
