"use client"

import { Save, Send } from "lucide-react"
import { useParams } from "next/navigation"
import type { Layout } from "react-grid-layout"
import DashboardGrid from "@/components/dashboard/dashboard-grid"
import { ChartConfigSidebar } from "@/components/editor/chart-config-sidebar"
import { DatasetPalette } from "@/components/editor/dataset-palette"
import { Button } from "@/components/ui/button"
import { usePanelEditor } from "@/hooks/use-panel-editor"

export default function DashboardEditPage() {
  const { id } = useParams<{ id: string }>()
  const editor = usePanelEditor(id)

  const {
    dashboard,
    isLoading,
    dirty,
    reorder,
    layout,
    setLayout,
    deletePanel,
    handleSave,
    handleEditPanel,
    handleDrop,
  } = editor

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (!dashboard)
    return <div className="p-6 text-sm text-muted-foreground">Dashboard not found</div>

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">{dashboard.name}</h1>
          <span className="text-xs text-muted-foreground">
            {dashboard.panels?.length ?? 0} panels
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => editor.router.push(`/${id}`)}>
            <Send className="size-4" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || reorder.isPending}>
            <Save className="size-4" /> Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          role="group"
          aria-label="Dashboard canvas"
          className="flex-1 overflow-auto p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <DashboardGrid
            dashboard={dashboard}
            editable
            layout={layout}
            onLayoutChange={(l) => {
              setLayout(l as Layout)
              editor.setDirty(true)
            }}
            onEditPanel={handleEditPanel}
            onDeletePanel={(panelId) => {
              deletePanel.mutate(panelId)
              setLayout((prev) => (prev ?? []).filter((item) => item.i !== panelId))
            }}
          />
        </div>

        <ChartConfigSidebar editor={editor} />
        <DatasetPalette editor={editor} />
      </div>
    </div>
  )
}
