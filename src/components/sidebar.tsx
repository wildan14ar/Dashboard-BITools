"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Database, BarChart3, Users, Menu } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <>
      <aside className={cn("flex h-full flex-col border-r bg-muted/30 transition-all", sidebarOpen ? "w-60" : "w-0 overflow-hidden")}>
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold text-sm">BI Dashboard</span>
          <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1 hover:bg-muted">
            <Menu className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-auto p-2 space-y-0.5">
          <button onClick={() => router.push("/sources")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Database className="size-4" /> Sources
          </button>
          <button onClick={() => router.push("/datasets")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <BarChart3 className="size-4" /> Datasets
          </button>
          <button onClick={() => router.push("/")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <BarChart3 className="size-4" /> Dashboards
          </button>
          <button onClick={() => router.push("/users")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Users className="size-4" /> Users
          </button>
        </nav>

        <div className="border-t p-2">
          <LogoutButton />
        </div>
      </aside>

      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} className="absolute left-2 top-3 z-10 rounded-md border bg-background p-1.5 shadow-sm hover:bg-muted">
          <Menu className="size-4" />
        </button>
      )}
    </>
  )
}
