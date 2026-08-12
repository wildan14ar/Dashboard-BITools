"use client"

import { useEffect, useRef, useState } from "react"
import GridLayout, { useContainerWidth, type Layout } from "react-grid-layout"
import { GripVertical, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react"
import "./react-grid.css"
import type { Dashboard, Panel } from "@/hooks/use-dashboards"
import { type RunData } from "@/lib/chart"
import { usePanelData } from "@/hooks/use-panel-data"
import { renderPanelTitle } from "@/components/dashboard/panel-title"
import {
  EChart,
  KpiChart,
  TableChart,
  TextChart,
} from "@/components/charts"

type Props = {
  dashboard: Dashboard
  editable?: boolean
  layout?: Layout
  onLayoutChange?: (layout: Layout) => void
  onEditPanel?: (panel: Panel) => void
  onDeletePanel?: (panelId: string) => void
  className?: string
}

export default function DashboardGrid({ dashboard, editable = false, layout, onLayoutChange, onEditPanel, onDeletePanel, className }: Props) {
  const { width, containerRef, mounted } = useContainerWidth()
  const panelData = usePanelData(dashboard.panels)

  if (!dashboard.panels?.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No panels yet
      </div>
    )
  }

  const gridLayout: Layout =
    layout && layout.length > 0
      ? layout
      : dashboard.panels.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h })) as unknown as Layout

  return (
    <div ref={containerRef} className={className}>
      {mounted && (
        <GridLayout
          width={width}
          layout={gridLayout}
          gridConfig={{ cols: 12, rowHeight: 50, margin: [10, 10] }}
          dragConfig={editable ? { enabled: true, handle: ".panel-drag-handle" } : { enabled: false }}
          resizeConfig={editable ? { enabled: true } : { enabled: false }}
          onLayoutChange={onLayoutChange}
        >
          {dashboard.panels.map((panel) => {
            const cfg = (panel.config as Record<string, unknown>) ?? {}
            const pad = Number(cfg.padding) || 8
            const titlePosition = (cfg.titlePosition as string) || "top"
            const titleEl = renderPanelTitle(panel.title, cfg)

            return (
              <div key={panel.id} className="group relative flex h-full flex-col overflow-hidden rounded border bg-background shadow-sm">
                {editable && (
                  <PanelMenu
                    panel={panel}
                    onEdit={onEditPanel}
                    onDelete={onDeletePanel}
                  />
                )}
                {titlePosition === "top" && titleEl}
                <div className="flex-1 overflow-hidden" style={{ padding: pad }}>
                  {panel.chartType === "text" ? (
                    <TextChart panel={panel} />
                  ) : panel.dataSetId ? (
                    <PanelBody panel={panel} data={panelData[panel.id]} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No dataset</div>
                  )}
                </div>
                {titlePosition === "bottom" && titleEl}
              </div>
            )
          })}
        </GridLayout>
      )}
    </div>
  )
}

function PanelMenu({ panel, onEdit, onDelete }: {
  panel: Panel
  onEdit?: (panel: Panel) => void
  onDelete?: (panelId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} className="absolute right-1 top-1 z-20 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <span className="panel-drag-handle cursor-grab rounded p-1 text-muted-foreground hover:bg-muted">
        <GripVertical className="size-3.5" />
      </span>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1 text-muted-foreground hover:bg-muted"
        aria-label="Panel options"
      >
        <MoreVertical className="size-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 w-32 rounded-md border bg-background p-1 shadow-md">
          {onEdit && (
            <button
              onClick={() => { setOpen(false); onEdit(panel) }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
            >
              <Pencil className="size-3.5" /> Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { setOpen(false); onDelete(panel.id) }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function PanelBody({ panel, data, preview = false }: { panel: Panel; data: RunData | null | undefined; preview?: boolean }) {
  if (data === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  if (!data) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
  }

  switch (panel.chartType) {
    case "kpi":
      return <KpiChart panel={panel} data={data} preview={preview} />
    case "table":
    case "":
      return <TableChart panel={panel} data={data} preview={preview} />
    default:
      return <EChart panel={panel} data={data} preview={preview} />
  }
}