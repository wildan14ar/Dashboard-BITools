"use client"

import "./globals.css"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Sidebar } from "@/components/sidebar"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <QueryClientProvider client={queryClient}>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  )
}
