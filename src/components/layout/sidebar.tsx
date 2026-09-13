"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";
import ButtonLogout from "@/components/layout/button-logout";

export type NavItem = { name: string; icon: ReactNode; href: string };

type SidebarProps = {
  items?: NavItem[];
  /** Show the sidebar only on these path prefixes ("*" suffix = any depth). */
  showOn?: string[];
  brandName?: string;
  children?: ReactNode;
};

export default function Sidebar({ items = [], showOn = ["/**"], brandName = "Dashboard", children }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const visible = showOn.some((p) =>
    p.endsWith("/**") ? pathname.startsWith(p.slice(0, -3)) : p === "*" || pathname === p
  );
  if (!visible) return null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside
      className={`sticky top-0 h-screen flex-col border-r border-border bg-background transition-[width] duration-200 ${
        open ? "w-64" : "w-16"
      } hidden sm:flex`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        {open && (
          <Link href="/" className="flex items-center gap-2 group no-underline">
            <span className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">
              {brandName}
            </span>
          </Link>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label={open ? "Close sidebar" : "Open sidebar"}
        >
          {open ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            title={item.name}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              open ? "" : "justify-center px-0"
            } ${
              isActive(item.href)
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {item.icon}
            {open && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>

      {children && open && <div className="px-3">{children}</div>}

      <div className="p-3 border-t border-border">
        <ButtonLogout />
      </div>
    </aside>
  );
}
