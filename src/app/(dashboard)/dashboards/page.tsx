"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import axios from "axios"
import { Plus, Trash2, LayoutDashboard, Eye, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Dashboard = { id: string; name: string; description: string | null; isPublic: boolean; _count: { panels: number }; createdAt: string }

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await axios.get("/api/dashboards")
    setDashboards(data)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this dashboard?")) return
    await axios.delete(`/api/dashboards/${id}`)
    fetchData()
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboards</h1>
        <Link href="/dashboards/new">
          <Button><Plus className="size-4" /> New Dashboard</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : dashboards.length === 0 ? (
          <p className="col-span-full py-12 text-center text-muted-foreground">No dashboards yet</p>
        ) : (
          dashboards.map((d) => (
            <div key={d.id} className="group rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-2 flex items-start justify-between">
                <LayoutDashboard className="size-5 text-muted-foreground" />
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link href={`/dashboards/${d.id}`}>
                    <Button variant="ghost" size="xs"><Eye className="size-3.5" /></Button>
                  </Link>
                  <Link href={`/dashboards/${d.id}/edit`}>
                    <Button variant="ghost" size="xs"><Edit3 className="size-3.5" /></Button>
                  </Link>
                  <Button variant="ghost" size="xs" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <h3 className="font-semibold truncate">{d.name}</h3>
              {d.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{d.description}</p>}
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{d._count.panels} panels</span>
                {d.isPublic && <span className="rounded bg-muted px-1.5 py-0.5">Public</span>}
                <span className="ml-auto">{new Date(d.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
