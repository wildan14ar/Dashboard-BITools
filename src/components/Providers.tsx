"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useLocale } from "next-intl"
import * as React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

function LanguageSync() {
  const locale = useLocale()

  React.useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes - data fresh selama 5 menit
            gcTime: 1000 * 60 * 10, // 10 minutes - cache disimpan 10 menit
            retry: 1, // Retry 1 kali jika gagal
            refetchOnWindowFocus: true, // Refetch saat window focus (untuk update data)
            refetchOnReconnect: true, // Refetch saat reconnect internet
            refetchOnMount: false, // Tidak refetch saat mount (gunakan cache)
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" disableTransitionOnChange>
        <LanguageSync />
        <Toaster richColors position="top-center" />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
