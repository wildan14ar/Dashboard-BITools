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

// Dashboard BI publik (/bi/[id]) — TANPA prefix locale, sehingga perlu
// NextIntlClientProvider sendiri: root layout tidak menyediakannya (hanya route
// group (dashboard)/(auth) yang membungkusnya). Tanpa ini useLocale() di
// Providers melontar "No intl context found".
export default async function BILayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale()
  const messages = await getRequestMessages(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  )
}
