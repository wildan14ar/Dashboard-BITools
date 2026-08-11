"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider } from "next-auth/react"
import { Database, BarChart3, Users, Layers } from "lucide-react"
import Sidebar from "@/components/sidebar"
import type { MenuItem } from "@/components/sidebar"

const menuConfig: MenuItem[] = [
  { key: "dashboards", translations: { en: "Dashboards" }, icon: <BarChart3 size={18} />, href: "/" },
  { key: "sources", translations: { en: "Sources" }, icon: <Database size={18} />, href: "/sources" },
  { key: "datasets", translations: { en: "Datasets" }, icon: <Layers size={18} />, href: "/datasets" },
  { key: "users", translations: { en: "Users" }, icon: <Users size={18} />, href: "/users" },
]

const validSidebar = ["/", "/sources/**", "/datasets/**", "/users/**", "/new"]

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen">
          <Sidebar
            menuConfig={menuConfig}
            validSidebar={validSidebar}
            brandName="BI Dashboard"
            defaultMenuOpen={true}
          />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </QueryClientProvider>
    </SessionProvider>
  )
}
