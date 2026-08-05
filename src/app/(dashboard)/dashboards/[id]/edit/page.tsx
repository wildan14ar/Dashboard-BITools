"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import GridLayout from "react-grid-layout"
import type { Layout } from "react-grid-layout"
import { ArrowLeft, Eye, Plus, Trash2, Save, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import "react-grid-layout/css/styles.css"

type Panel = { id: string; title: string; chartType: string; config: Record<string, unknown> | null; x: number; y: number; w: number; h: number; dataSetId: string | null }
type FilterDef = { id: string; name: string; label: string; type: string; config: Record<string, unknown> | null }
type Dashboard = { id: string; name: string; panels: Panel[]; filters: FilterDef[] }
type Dataset = { id: string; name: string }

const CHART_TYPES = ["table", "bar", "line", "pie", "area", "scatter"]

export default function EditDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [layout, setLayout] = useState<Layout>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [showAdd, setShowAdd] = useState<"panel" | "filter" | null>(null)
  const [newPanel, setNewPanel] = useState({ title: "", chartType: "table", dataSetId: "" })
  const [newFilter, setNewFilter] = useState({ name: "", label: "", type: "text" })
  const [id, setId] = useState("")

  useEffect(() => { params.then((p) => { setId(p.id); loadData(p.id) }) }, [])

  async function loadData(dashboardId: string) {
    const [{ data: d }, { data: ds }] = await Promise.all([
      axios.get(`/api/dashboards/${dashboardId}`),
      axios.get("/api/datasets"),
    ])
    setDashboard(d)
    setLayout(d.panels.map((p: Panel) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h })))
    setDatasets(ds)
  }

  async function handleSaveLayout() {
    await axios.put(`/api/dashboards/${id}/panels/reorder`, layout)
  }

  async function handleAddPanel() {
    const { data } = await axios.post(`/api/dashboards/${id}/panels`, { ...newPanel, x: 0, y: 0, w: 6, h: 4 })
    setDashboard((p) => p ? { ...p, panels: [...p.panels, data] } : p)
    setLayout((p) => [...p, { i: data.id, x: 0, y: 0, w: 6, h: 4 }])
    setShowAdd(null)
    setNewPanel({ title: "", chartType: "table", dataSetId: "" })
  }

  async function handleDeletePanel(panelId: string) {
    await axios.delete(`/api/dashboards/${id}/panels/${panelId}`)
    setDashboard((p) => p ? { ...p, panels: p.panels.filter((p) => p.id !== panelId) } : p)
    setLayout((p) => p.filter((l) => l.i !== panelId))
  }

  async function handleAddFilter() {
    const { data } = await axios.post(`/api/dashboards/${id}/filters`, newFilter)
    setDashboard((p) => p ? { ...p, filters: [...p.filters, data] } : p)
    setShowAdd(null)
    setNewFilter({ name: "", label: "", type: "text" })
  }

  async function handleDeleteFilter(filterId: string) {
    await axios.delete(`/api/dashboards/${id}/filters/${filterId}`)
    setDashboard((p) => p ? { ...p, filters: p.filters.filter((f) => f.id !== filterId) } : p)
  }

  if (!dashboard) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboards")}><ArrowLeft className="size-4" /></Button>
        <h1 className="text-lg font-semibold">{dashboard.name}</h1>
        <span className="text-xs text-muted-foreground">Edit mode</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAdd(showAdd === "panel" ? null : "panel")}><Plus className="size-3.5" /> Panel</Button>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(showAdd === "filter" ? null : "filter")}><Filter className="size-3.5" /> Filter</Button>
          <Button variant="outline" size="sm" onClick={handleSaveLayout}><Save className="size-3.5" /> Save</Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboards/${id}`)}><Eye className="size-3.5" /> View</Button>
        </div>
      </div>

      {showAdd === "panel" && (
        <div className="flex items-end gap-3 border-b bg-muted/20 px-6 py-3">
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Title</span>
            <input value={newPanel.title} onChange={(e) => setNewPanel((p) => ({ ...p, title: e.target.value }))} className="input h-7 text-xs" placeholder="Panel title" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Chart</span>
            <select value={newPanel.chartType} onChange={(e) => setNewPanel((p) => ({ ...p, chartType: e.target.value }))} className="input h-7 text-xs">
              {CHART_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Dataset</span>
            <select value={newPanel.dataSetId} onChange={(e) => setNewPanel((p) => ({ ...p, dataSetId: e.target.value }))} className="input h-7 text-xs">
              <option value="">None</option>
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <Button size="xs" onClick={handleAddPanel} disabled={!newPanel.title}>Add</Button>
        </div>
      )}

      {showAdd === "filter" && (
        <div className="flex items-end gap-3 border-b bg-muted/20 px-6 py-3">
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Name</span>
            <input value={newFilter.name} onChange={(e) => setNewFilter((p) => ({ ...p, name: e.target.value }))} className="input h-7 text-xs w-24" placeholder="start_date" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Label</span>
            <input value={newFilter.label} onChange={(e) => setNewFilter((p) => ({ ...p, label: e.target.value }))} className="input h-7 text-xs w-28" placeholder="Start Date" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Type</span>
            <select value={newFilter.type} onChange={(e) => setNewFilter((p) => ({ ...p, type: e.target.value }))} className="input h-7 text-xs">
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select</option>
              <option value="date_range">Date Range</option>
            </select>
          </label>
          <Button size="xs" onClick={handleAddFilter} disabled={!newFilter.name || !newFilter.label}>Add</Button>
        </div>
      )}

      {dashboard.filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/10 px-6 py-1.5">
          {dashboard.filters.map((f) => (
            <span key={f.id} className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px]">
              <Filter className="size-3 text-muted-foreground" />
              {f.label} ({f.type})
              <button onClick={() => handleDeleteFilter(f.id)} className="ml-1 rounded hover:bg-destructive/10">
                <Trash2 className="size-3 text-muted-foreground" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <GridLayout
          className="layout"
          layout={layout}
          gridConfig={{ cols: 12, rowHeight: 60 }}
          width={Math.min(window.innerWidth - 280, 1400)}
          onLayoutChange={(newLayout) => setLayout([...newLayout])}
          dragConfig={{ enabled: true, handle: ".drag-handle" }}
        >
          {dashboard.panels.map((panel) => (
            <div key={panel.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className="drag-handle flex cursor-move items-center justify-between border-b bg-muted/30 px-3 py-1">
                <span className="text-xs font-medium truncate">{panel.title}</span>
                <button onClick={() => handleDeletePanel(panel.id)} className="rounded p-0.5 hover:bg-destructive/10">
                  <Trash2 className="size-3 text-muted-foreground" />
                </button>
              </div>
              <div className="flex h-[calc(100%-28px)] flex-col items-center justify-center gap-1 p-2">
                <span className="text-[10px] text-muted-foreground">{panel.chartType}</span>
                <span className="text-[10px] text-muted-foreground/60">{datasets.find((d) => d.id === panel.dataSetId)?.name ?? "No dataset"}</span>
              </div>
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  )
}
