import type { MetadataRoute } from "next"

export const revalidate = 3600

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  return {
    name: "BI Tools",
    short_name: "BI Tools",
    description: "Business Intelligence Dashboard",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    categories: ["technology", "business", "productivity"],
    lang: "id-ID",
    dir: "ltr",
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Open dashboard",
        url: "/dashboard",
        icons: [{ src: "/favicon.svg", sizes: "any" }],
      },
      {
        name: "Calendar",
        short_name: "Calendar",
        description: "Open calendar",
        url: "/dashboard/calendar",
        icons: [{ src: "/favicon.svg", sizes: "any" }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  }
}
