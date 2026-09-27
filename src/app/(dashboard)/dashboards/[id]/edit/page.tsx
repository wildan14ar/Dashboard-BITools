"use client"

import { Save, Send } from "lucide-react"
import { useParams } from "next/navigation"
import { Suspense } from "react"
import type { Layout } from "react-grid-layout"
import DashboardGrid from "@/components/dashboard/dashboard-grid"
import { ChartConfigSidebar } from "@/components/editor/chart-config-sidebar"
import { DatasetPalette } from "@/components/editor/dataset-palette"
import { Protected } from "@/components/Protected"
import { Button } from "@/components/ui/button"
import { usePanelEditor } from "@/hooks/use-panel-editor"

function DashboardEditContent({ id }: { id: string }) {
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

  if (isLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading...</div>
  }
  if (!dashboard) {
    return <div className="p-10 text-sm text-muted-foreground">Dashboard tidak ditemukan.</div>
  }

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">{dashboard.name}</h1>
          <span className="text-xs text-muted-foreground">
            {dashboard.panels?.length ?? 0} panels
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.router.push(`/dashboards/${id}`)}
          >
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
              deletePanel.mutate({ dashboardId: id, panelId })
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

export default function DashboardEditPage() {
  const params = useParams<{ id: string }>()
  return (
    <Protected
      permissions={["dashboards:update"]}
      fallback={
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold">Akses ditolak</h3>
          <p className="text-on-surface-variant">Butuh permission dashboards:update.</p>
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <DashboardEditContent id={params.id} />
      </Suspense>
    </Protected>
  )
}
