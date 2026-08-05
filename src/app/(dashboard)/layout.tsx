"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { ChevronRight, Folder, FolderOpen, Database, BarChart3, Users, Menu } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { cn } from "@/lib/utils"

type Folder = { id: string; name: string; parentId: string | null }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => { fetchFolders() }, [])

  async function fetchFolders() {
    try { const { data } = await axios.get("/api/folders"); setFolders(data) }
    catch { /* folders not implemented yet */ }
  }

  function toggle(id: string) {
    setExpanded((p) => {
      const next = new Set(p)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function buildTree(parentId: string | null, depth = 0): React.ReactNode[] {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((f) => {
        const open = expanded.has(f.id)
        const hasChildren = folders.some((c) => c.parentId === f.id)
        return (
          <div key={f.id}>
            <button
              onClick={() => (hasChildren ? toggle(f.id) : router.push(`/dashboards?folder=${f.id}`))}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              style={{ paddingLeft: 12 + depth * 16 }}
            >
              {hasChildren ? (
                <ChevronRight className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")} />
              ) : (
                <span className="w-3" />
              )}
              {open ? <FolderOpen className="size-4 shrink-0" /> : <Folder className="size-4 shrink-0" />}
              <span className="truncate">{f.name}</span>
            </button>
            {open && buildTree(f.id, depth + 1)}
          </div>
        )
      })
  }

  return (
    <div className="flex h-screen">
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
          <button onClick={() => router.push("/dashboards")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <BarChart3 className="size-4" /> Dashboards
          </button>
          <button onClick={() => router.push("/users")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Users className="size-4" /> Users
          </button>

          <div className="my-2 border-t" />
          <p className="px-2 py-1 text-[10px] font-medium uppercase text-muted-foreground/60">Folders</p>
          {buildTree(null)}
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

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
