"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Plus, Save, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboard, useCreatePanel, useDeletePanel, useReorderPanels } from "@/hooks/use-dashboards"
import { useDatasets } from "@/hooks/use-datasets"
import type { Layout } from "react-grid-layout"
import DashboardGrid from "@/components/dashboard-grid"

export default function DashboardEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: dashboard, isLoading } = useDashboard(id)
  const { data: datasets = [] } = useDatasets()
  const createPanel = useCreatePanel(id)
  const deletePanel = useDeletePanel(id)
  const reorder = useReorderPanels(id)
  const [layout, setLayout] = useState<Layout>([])
  const [selectedDataset, setSelectedDataset] = useState("")
  const [dirty, setDirty] = useState(false)

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (!dashboard) return <div className="p-6 text-sm text-muted-foreground">Dashboard not found</div>

  const handleSave = () => {
    if (!layout.length) return
    const payload = dashboard.panels!.map((p) => {
      const item = layout.find((l) => l.i === p.id)
      return item ? { id: p.id, x: item.x, y: item.y, w: item.w, h: item.h } : { id: p.id, x: p.x, y: p.y, w: p.w, h: p.h }
    })
    reorder.mutate(payload, { onSuccess: () => { setDirty(false); router.push(`/${id}`) } })
  }

  const handleAdd = () => {
    const ds = datasets.find((d) => d.id === selectedDataset)
    if (!ds) return
    createPanel.mutate({ dataSetId: ds.id, title: ds.name, chartType: "table" })
    setSelectedDataset("")
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag or resize panels, then save. Delete via the X on a panel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${id}`)}>
            <Send className="size-4" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || reorder.isPending}>
            <Save className="size-4" /> Save Layout
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Add panel from dataset</label>
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            className="h-8 rounded-lg border bg-background px-2 text-sm"
          >
            <option value="">Select dataset…</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!selectedDataset || createPanel.isPending}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      <DashboardGrid
        dashboard={dashboard}
        editable
        layout={layout}
        onLayoutChange={(l) => { setLayout(l); setDirty(true) }}
        onDeletePanel={(panelId) => deletePanel.mutate(panelId)}
      />
    </div>
  )
}