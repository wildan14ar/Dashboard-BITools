import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["id", "en"],
  defaultLocale: "en",
  localePrefix: "always",
})
