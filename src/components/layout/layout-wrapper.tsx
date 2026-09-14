"use client"

import { BarChart3, Database, Layers, Users } from "lucide-react"
import Sidebar from "@/components/layout/sidebar"
import Providers from "@/components/Providers"

const items = [
  { name: "Dashboards", icon: <BarChart3 size={18} />, href: "/" },
  { name: "Sources", icon: <Database size={18} />, href: "/sources" },
  { name: "Datasets", icon: <Layers size={18} />, href: "/datasets" },
  { name: "Users", icon: <Users size={18} />, href: "/users" },
]

// Hide chrome on full-screen dashboard pages (/[id], /[id]/edit)
const showOn = ["/", "/sources/**", "/datasets/**", "/users/**", "/new"]

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex h-screen">
        <Sidebar items={items} showOn={showOn} brandName="BI Dashboard" />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </Providers>
  )
}
