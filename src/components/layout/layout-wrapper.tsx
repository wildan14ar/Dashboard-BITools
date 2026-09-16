"use client"

import { BarChart3, Database, Layers, Settings2, Users } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Header from "@/components/layout/header"
import Sidebar, { type NavItem } from "@/components/layout/sidebar"
import Providers from "@/components/Providers"
import { useAuth } from "@/hooks/use-auth"

type MenuEntry = {
  name: string
  icon: ReactNode
  href?: string
  /** Permission yang dibutuhkan untuk melihat menu ini (salah satu cukup). */
  permissions?: string[]
  subMenu?: { name: string; href: string; permissions?: string[] }[]
}

const items: MenuEntry[] = [
  { name: "Dashboards", icon: <BarChart3 size={18} />, href: "/" },
  {
    name: "Sources",
    icon: <Database size={18} />,
    href: "/sources",
    permissions: ["sources:read"],
  },
  { name: "Datasets", icon: <Layers size={18} />, href: "/datasets" },
  {
    name: "User Management",
    icon: <Users size={18} />,
    subMenu: [
      { name: "Users", href: "/users", permissions: ["users:admin"] },
      { name: "Roles", href: "/roles", permissions: ["roles:read"] },
    ],
  },
  {
    name: "System",
    icon: <Settings2 size={18} />,
    subMenu: [
      { name: "Sessions", href: "/sessions", permissions: ["sessions:view"] },
      { name: "Activity Logs", href: "/logs", permissions: ["logs:view"] },
    ],
  },
]

function filterItems(entries: MenuEntry[], can: (p: string[]) => boolean): NavItem[] {
  const out: NavItem[] = []
  for (const entry of entries) {
    const { permissions, subMenu, ...rest } = entry
    if (subMenu) {
      const visible = subMenu
        .filter((sub) => !sub.permissions || can(sub.permissions))
        .map((sub) => ({ name: sub.name, href: sub.href }))
      if (visible.length > 0) {
        out.push({ ...rest, subMenu: visible })
      }
    } else if (!permissions || can(permissions)) {
      out.push(rest)
    }
  }
  return out
}

// Hide chrome on full-screen dashboard pages (/[id], /[id]/edit),
// auth (/login) dan public share (/bi/public, /bi/embed).
const showOn = [
  "/",
  "/sources/**",
  "/datasets/**",
  "/users/**",
  "/roles/**",
  "/sessions/**",
  "/logs/**",
  "/new",
]

const SIDEBAR_STORAGE_KEY = "ui-store-sidebar"

function getStoredSidebar(): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed === "boolean") return parsed
    }
  } catch {}
  return true
}

function storeSidebar(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(value))
  } catch {}
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const { can, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(getStoredSidebar)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    storeSidebar(sidebarOpen)
  }, [sidebarOpen])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const handleSidebarToggle = useCallback((open: boolean) => {
    setSidebarOpen(open)
  }, [])

  // Selama auth loading, tampilkan semua menu agar tidak berkedip;
  // setelah itu filter berdasarkan permission user.
  const visibleItems = isLoading ? items : filterItems(items, can)

  return (
    <div className="flex h-screen">
      <Sidebar
        items={visibleItems}
        showOn={showOn}
        brandName="BI Dashboard"
        isMenuOpen={sidebarOpen}
        onMenuToggle={handleSidebarToggle}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header showOn={showOn} onMenuToggle={toggleSidebar} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
