"use client"

import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { useState } from "react"
import ButtonLogout from "@/components/atoms/ButtonLogout"

export type SubNavItem = { name: string; href: string }
export type NavItem = { name: string; icon: ReactNode; href?: string; subMenu?: SubNavItem[] }

type SidebarProps = {
  items?: NavItem[]
  /** Show the sidebar only on these path prefixes ("*" suffix = any depth). */
  showOn?: string[]
  brandName?: string
  isMenuOpen?: boolean
  defaultMenuOpen?: boolean
  onMenuToggle?: (open: boolean) => void
  children?: ReactNode
  widthClassName?: string
  widthValue?: number
}

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

export default function Sidebar({
  items = [],
  showOn = ["/**"],
  brandName = "Dashboard",
  isMenuOpen: controlledMenu,
  defaultMenuOpen = true,
  onMenuToggle,
  children,
  widthClassName = "sm:w-64",
  widthValue = 256,
}: SidebarProps) {
  const pathname = usePathname()

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultMenuOpen)
  const isControlledMenu = controlledMenu !== undefined
  const open = isControlledMenu ? controlledMenu! : uncontrolledOpen
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)

  const toggleMenu = () => {
    const next = !open
    if (isControlledMenu) onMenuToggle?.(next)
    else setUncontrolledOpen(next)
  }

  const toggleSubMenu = (name: string) => {
    setOpenSubMenu((prev) => (prev === name ? null : name))
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))

  if (!isValidPath(pathname, showOn)) return null

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.div
            key="collapsed"
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="hidden h-full border-r border-border bg-background p-3 shadow-sm sm:block"
          >
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={toggleMenu}
                className="rounded-lg border border-border bg-card p-2 shadow-sm transition-colors hover:bg-accent"
                aria-label="Open sidebar"
              >
                <PanelLeftOpen size={20} />
              </button>
              <div className="hidden flex-col items-center gap-3 sm:flex">
                {items.map((item) => (
                  <Link
                    href={item.href ?? item.subMenu?.[0]?.href ?? "#"}
                    key={item.name}
                    title={item.name}
                    className="rounded-lg border border-border bg-card p-2 shadow-sm transition-colors hover:bg-accent"
                  >
                    {item.icon}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.aside
            key="expanded"
            initial={false}
            animate={{ x: 0 }}
            exit={{ x: -widthValue, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`fixed top-0 left-0 z-50 flex h-screen w-full ${widthClassName} flex-col border-r border-border bg-background shadow-xl md:sticky`}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <Link href="/" className="group flex items-center gap-2 no-underline">
                <span className="font-bold text-xl text-foreground transition-colors group-hover:text-primary">
                  {brandName}
                </span>
              </Link>
              <button
                type="button"
                onClick={toggleMenu}
                className="rounded-lg p-2 transition-colors hover:bg-accent"
                aria-label="Close sidebar"
              >
                <PanelLeftClose size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-hidden-y">
              {items.length > 0 && (
                <nav className="space-y-1 p-3">
                  {items.map((item) => (
                    <div key={item.name} className="space-y-0.5">
                      {item.subMenu ? (
                        <button
                          type="button"
                          onClick={() => toggleSubMenu(item.name)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-expanded={openSubMenu === item.name}
                        >
                          <div className="flex items-center gap-2">
                            {item.icon}
                            <span>{item.name}</span>
                          </div>
                          <motion.span
                            animate={{ rotate: openSubMenu === item.name ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown size={16} />
                          </motion.span>
                        </button>
                      ) : (
                        <Link
                          href={item.href || "#"}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            item.href && isActive(item.href)
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          }`}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </Link>
                      )}

                      <AnimatePresence>
                        {openSubMenu === item.name && item.subMenu && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-1 ml-8 space-y-1 overflow-hidden"
                          >
                            {item.subMenu.map((sub) => (
                              <Link
                                key={sub.name}
                                href={sub.href}
                                className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                  isActive(sub.href)
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </nav>
              )}

              {children && <div className="px-3">{children}</div>}
            </div>

            <div className="space-y-2 border-t border-border p-3">
              <ButtonLogout />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMenu}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  )
}
