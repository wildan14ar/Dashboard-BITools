import { cookies, headers } from "next/headers"
import { routing } from "@/i18n/routing"

function isSupported(locale: string | null | undefined): locale is string {
  return !!locale && (routing.locales as readonly string[]).includes(locale)
}

/**
 * Locale untuk rute TANPA prefix ([locale] tak ada).
 * Urutan: header x-locale (dihitung proxy: cookie → bahasa browser →
 * default) → cookie langsung → default. Samakan dengan logika proxy.
 */
export async function getRequestLocale(): Promise<string> {
  const fromHeader = (await headers()).get("x-locale")
  if (isSupported(fromHeader)) return fromHeader

  const fromCookie = (await cookies()).get("locale")?.value
  if (isSupported(fromCookie)) return fromCookie

  return routing.defaultLocale
}

export async function getRequestMessages(locale: string): Promise<Record<string, unknown>> {
  return (await import(`@/i18n/messages/${locale}.json`)).default
}
