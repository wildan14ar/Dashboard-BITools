"use client"

import Link from "next/link"
import { Plus, Trash2, LayoutDashboard, Eye, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboards, useDeleteDashboard } from "@/hooks/use-dashboards"

export default function HomePage() {
  const { data: dashboards = [], isLoading } = useDashboards()
  const deleteDashboard = useDeleteDashboard()

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboards</h1>
        <Link href="/new">
          <Button><Plus className="size-4" /> New Dashboard</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : dashboards.length === 0 ? (
          <p className="col-span-full py-12 text-center text-muted-foreground">No dashboards yet</p>
        ) : (
          dashboards.map((d) => (
            <div key={d.id} className="group rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-2 flex items-start justify-between">
                <LayoutDashboard className="size-5 text-muted-foreground" />
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link href={`/${d.id}`}>
                    <Button variant="ghost" size="xs"><Eye className="size-3.5" /></Button>
                  </Link>
                  <Link href={`/${d.id}/edit`}>
                    <Button variant="ghost" size="xs"><Edit3 className="size-3.5" /></Button>
                  </Link>
                  <Button variant="ghost" size="xs" onClick={() => { if (confirm("Delete this dashboard?")) deleteDashboard.mutate(d.id) }}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <h3 className="font-semibold truncate">{d.name}</h3>
              {d.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{d.description}</p>}
              {d.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{d.isPublic ? "Public" : "Private"}</span>
                <span className="ml-auto">{new Date(d.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
