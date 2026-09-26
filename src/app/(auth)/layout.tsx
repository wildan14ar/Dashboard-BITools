import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import Providers from "@/components/Providers"
import { getRequestLocale, getRequestMessages } from "@/lib/locale-server"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

// Auth TANPA prefix locale (/login, /register).
// Locale: header x-locale (proxy) → cookie → default.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale()
  const messages = await getRequestMessages(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  )
}
