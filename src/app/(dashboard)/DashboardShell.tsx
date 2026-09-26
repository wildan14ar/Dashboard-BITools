"use client"

import {
  CalendarDays,
  ChevronRight,
  Clock,
  FolderClosed,
  HardDrive,
  House,
  KeyRound,
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import ButtonTheme from "@/components/atoms/ButtonTheme"
import NotificationBell from "@/components/NotificationBell"
import Sidebar, { type MenuItem } from "@/components/Sidebar"
import { useAuth } from "@/hooks/use-auth"
import { authClient } from "@/lib/auth-client"

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

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { can, status } = useAuth()
  // Init SELALU true agar sama dengan SSR; preferensi user dibaca setelah mount
  // (baca localStorage saat render = hydration mismatch).
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const firstRender = useRef(true)
  const pathname = usePathname()

  useEffect(() => {
    setSidebarOpen(getStoredSidebar())
  }, [])

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

  useEffect(() => {
    if (status === "unauthenticated") {
      authClient.signOut({ callbackURL: "/login" })
    }
  }, [status])

  useEffect(() => {
    const handleUnauthorized = () => {
      authClient.signOut({ callbackURL: "/login" })
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized)
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized)
  }, [])

  // Define sidebar menu configuration with translations
  const menuConfig: MenuItem[] = [
    {
      key: "dashboard",
      translations: {
        id: "Dashboard",
        en: "Dashboard",
      },
      icon: <LayoutDashboard size={20} />,
      href: "/",
    },
    {
      key: "calendar",
      translations: {
        id: "Kalender",
        en: "Calendar",
      },
      icon: <CalendarDays size={20} />,
      href: "/calendar",
    },
    {
      key: "files",
      translations: {
        id: "File Saya",
        en: "My Files",
      },
      icon: <FolderClosed size={20} />,
      href: "/attachment",
    },
    ...(can(["attachments:admin"])
      ? [
          {
            key: "storage",
            translations: {
              id: "Storage",
              en: "Storage",
            },
            icon: <HardDrive size={20} />,
            href: "/storage",
          },
        ]
      : []),
    ...(can(["users:admin"])
      ? [
          {
            key: "users-management",
            translations: {
              id: "Manajemen Pengguna",
              en: "Users Management",
            },
            icon: <Users size={20} />,
            subMenu: [
              {
                key: "users",
                translations: { id: "Pengguna", en: "Users" },
                href: "/users",
              },
              {
                key: "roles",
                translations: { id: "Role", en: "Roles" },
                href: "/roles",
              },
            ],
          },
        ]
      : []),
    ...(can(["sessions:read", "logs:read"])
      ? [
          {
            key: "activity-management",
            translations: {
              id: "Aktivitas Pengguna",
              en: "Activity Management",
            },
            icon: <Clock size={20} />,
            subMenu: [
              {
                key: "sessions",
                translations: { id: "Session", en: "Sessions" },
                href: "/sessions",
              },
              {
                key: "logging",
                translations: { id: "Logging", en: "Logging" },
                href: "/logging",
              },
            ],
          },
        ]
      : []),
    ...(can(["keys:read", "keys:create", "keys:update", "keys:delete"])
      ? [
          {
            key: "api-keys",
            translations: {
              id: "API Keys",
              en: "API Keys",
            },
            icon: <KeyRound size={20} />,
            href: "/api-keys",
          },
        ]
      : []),
  ]

  // Generate breadcrumbs based on current pathname (dashboard di root "/").
  // Hanya "Home" dirender sebagai ikon, sisanya teks seperti semula.
  const generateBreadcrumbs = () => {
    if (!pathname) return []

    const pathParts = pathname.split("/").filter((part) => part)
    const breadcrumbs = [{ href: "/", label: "Home", segment: "home" }]

    let currentPath = ""
    for (const part of pathParts) {
      currentPath += `/${part}`

      // Format label by capitalizing and replacing hyphens/underscores with spaces
      let label = part.charAt(0).toUpperCase() + part.slice(1)
      label = label.replace(/[-_]/g, " ")

      breadcrumbs.push({ href: currentPath, label, segment: part })
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <div className="min-h-screen bg-background flex flex-row w-full">
      {/* Sidebar */}
      <div className="min-h-full">
        <Sidebar
          menuConfig={menuConfig}
          validSidebar={["/**"]}
          isMenuOpen={sidebarOpen}
          onMenuToggle={toggleSidebar}
          widthClassName="sm:w-64"
          widthValue={256}
        />
      </div>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 w-full`}>
        {/* Dashboard Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-13 px-4 sm:px-6 lg:px-8">
            {/* Left side - Breadcrumb Navigation */}
            <div className="flex items-center gap-2">
              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={toggleSidebar}
                className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu size={24} />
              </button>

              {/* Breadcrumb Navigation */}
              <nav className="hidden sm:flex items-center gap-1" aria-label="Breadcrumb">
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={index} className="flex items-center">
                    <Link
                      href={breadcrumb.href}
                      title={breadcrumb.label}
                      aria-label={breadcrumb.label}
                      className="px-2 py-1 rounded text-sm hover:bg-accent transition-colors"
                    >
                      {index === 0 ? <House size={16} className="block" /> : breadcrumb.label}
                    </Link>
                    {index < breadcrumbs.length - 1 && (
                      <ChevronRight size={16} className="text-muted-foreground" />
                    )}
                  </div>
                ))}
              </nav>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <ButtonTheme />
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto space-y-6">{children}</main>
      </div>
    </div>
  )
}
