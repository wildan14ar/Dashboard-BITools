import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import Providers from "@/components/Providers"
import { getRequestLocale, getRequestMessages } from "@/lib/locale-server"
import DashboardShell from "./DashboardShell"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

// Dashboard di root TANPA prefix locale (/, /calendar, /users, ...).
// Locale: header x-locale (proxy) → cookie → default.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale()
  const messages = await getRequestMessages(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <DashboardShell>{children}</DashboardShell>
      </Providers>
    </NextIntlClientProvider>
  )
}
