"use client"

import { ChevronRight, House, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ButtonTheme } from "@/components/atoms/ButtonTheme"

function isValidPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    if (p.endsWith("/**")) return pathname.startsWith(p.slice(0, -3))
    if (p.endsWith("/*")) {
      const base = p.slice(0, -2)
      if (!pathname.startsWith(base)) return false
      const rest = pathname.slice(base.length).replace(/^\//, "")
      return rest.length > 0 && !rest.includes("/")
    }
    return p === "*" || pathname === p
  })
}

function formatLabel(segment: string): string {
  const clean = segment.replace(/[-_]/g, " ")
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

type HeaderProps = {
  onMenuToggle?: () => void
  showOn?: string[]
}

export default function Header({ onMenuToggle, showOn = ["/**"] }: HeaderProps) {
  const pathname = usePathname()

  if (!isValidPath(pathname, showOn)) return null

  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs = [{ href: "/", label: "Home", icon: true }]
  let currentPath = ""
  for (const seg of segments) {
    currentPath += `/${seg}`
    breadcrumbs.push({ href: currentPath, label: formatLabel(seg), icon: false })
  }

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-13 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>

          <nav className="hidden sm:flex items-center gap-1" aria-label="Breadcrumb">
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={`${breadcrumb.href}-${index}`} className="flex items-center">
                <Link
                  href={breadcrumb.href}
                  aria-label={breadcrumb.icon ? "Home" : undefined}
                  className="px-2 py-1 rounded text-sm hover:bg-accent transition-colors text-muted-foreground hover:text-foreground last:text-foreground"
                >
                  {breadcrumb.icon ? <House size={16} /> : breadcrumb.label}
                </Link>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight size={16} className="text-muted-foreground" />
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <ButtonTheme />
        </div>
      </div>
    </header>
  )
}
