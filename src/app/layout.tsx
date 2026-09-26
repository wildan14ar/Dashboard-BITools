import "@/styles/globals.css"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { headers } from "next/headers"
import type { ReactNode } from "react"
import { settings } from "@/config/settings"
import { routing } from "@/i18n/routing"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

type Props = {
  children: ReactNode
}

// metadataBase di root agar semua rute (dashboard, login,
// register) tidak warning "metadataBase not set" untuk OG/Twitter images.
export const metadata: Metadata = {
  metadataBase: new URL(settings.BETTER_AUTH_URL),
}

// Root layout WAJIB render <html>/<body> (Next.js menegakkannya di dev).
// Lang dibaca dari header x-locale yang disuntik proxy (root tidak punya params).
export default async function RootLayout({ children }: Props) {
  const headerLocale = (await headers()).get("x-locale")
  const locale = (routing.locales as readonly string[]).includes(headerLocale ?? "")
    ? headerLocale!
    : routing.defaultLocale

  return (
    <html lang={locale} suppressHydrationWarning className="scrollbar-hide">
      <head>
        {/* Inline polos (bukan next/script): urutan eksekusi deterministik
            sebelum body di-parse — anti-FOUC theme. Identik di SSR & client,
            jadi tidak ada hydration error. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `;(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased scrollbar-hide`}>
        {children}
      </body>
    </html>
  )
}
