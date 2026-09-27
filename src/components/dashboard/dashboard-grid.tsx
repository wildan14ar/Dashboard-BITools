"use client"

import { toPng } from "html-to-image"
import { GripVertical, ImageDown, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import GridLayout, { type Layout, useContainerWidth } from "react-grid-layout"
import "./react-grid.css"
import { EChart, FilterChart, KpiChart, TableChart, TextChart } from "@/components/charts"
import { renderPanelTitle } from "@/components/dashboard/panel-title"
import { RunMetaBadge } from "@/components/dashboard/run-meta"
import type { BiDashboard as Dashboard, Panel } from "@/hooks/use-dashboards"
import { usePanelData } from "@/hooks/use-panel-data"
import type { RunData } from "@/lib/chart"

type Props = {
  dashboard: Dashboard
  editable?: boolean
  layout?: Layout
  onLayoutChange?: (layout: Layout) => void
  onEditPanel?: (panel: Panel) => void
  onDeletePanel?: (panelId: string) => void
  className?: string
}

async function downloadPanelImage(panel: Panel, node: HTMLElement) {
  const safe = (panel.title || "panel").replace(/[^\w\- ]+/g, "").trim() || "panel"
  const download = (dataUrl: string) => {
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `${safe}.png`
    a.click()
  }

  for (const opts of [{ pixelRatio: 2 }, { pixelRatio: 2, skipFonts: true }]) {
    try {
      const dataUrl = await toPng(node, opts)
      return download(dataUrl)
    } catch {
      // try next strategy
    }
  }

  const canvas = node.querySelector("canvas")
  if (canvas) {
    try {
      return download(canvas.toDataURL("image/png"))
    } catch {
      // fall through
    }
  }

  console.error("Failed to export panel image")
  alert("Gagal mengekspor gambar panel")
}

export default function DashboardGrid({
  dashboard,
  editable = false,
  layout,
  onLayoutChange,
  onEditPanel,
  onDeletePanel,
  className,
}: Props) {
  const { width, containerRef, mounted } = useContainerWidth()
  const panelData = usePanelData(dashboard.panels)
  const panelRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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
      : (dashboard.panels.map((p) => ({
          i: p.id,
          x: p.x,
          y: p.y,
          w: p.w,
          h: p.h,
        })) as unknown as Layout)

  return (
    <div ref={containerRef} className={className}>
      {mounted && (
        <GridLayout
          width={width}
          layout={gridLayout}
          gridConfig={{ cols: 12, rowHeight: 50, margin: [10, 10] }}
          dragConfig={
            editable ? { enabled: true, handle: ".panel-drag-handle" } : { enabled: false }
          }
          resizeConfig={editable ? { enabled: true } : { enabled: false }}
          onLayoutChange={onLayoutChange}
        >
          {dashboard.panels.map((panel) => {
            const cfg = (panel.config as Record<string, unknown>) ?? {}
            const pad = Number(cfg.padding) || 8
            const titlePosition = (cfg.titlePosition as string) || "top"
            const titleEl = renderPanelTitle(panel.title, cfg)

            return (
              <div
                key={panel.id}
                ref={(el) => {
                  if (el) panelRefs.current.set(panel.id, el)
                  else panelRefs.current.delete(panel.id)
                }}
                className="group relative flex h-full flex-col overflow-hidden rounded border bg-background shadow-sm"
              >
                {editable && (
                  <PanelMenu
                    panel={panel}
                    onEdit={onEditPanel}
                    onDelete={onDeletePanel}
                    onDownload={(p) => {
                      const node = panelRefs.current.get(p.id)
                      if (node) downloadPanelImage(p, node)
                    }}
                  />
                )}
                {titlePosition === "top" && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">{titleEl}</div>
                    <div className="shrink-0 pr-2">
                      <RunMetaBadge data={panelData[panel.id]} />
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-hidden" style={{ padding: pad }}>
                  {panel.chartType === "text" ? (
                    <TextChart panel={panel} />
                  ) : panel.dataSetId ? (
                    <PanelBody panel={panel} data={panelData[panel.id]} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No dataset
                    </div>
                  )}
                </div>
                {titlePosition === "bottom" && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">{titleEl}</div>
                    <div className="shrink-0 pr-2">
                      <RunMetaBadge data={panelData[panel.id]} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </GridLayout>
      )}
    </div>
  )
}

function PanelMenu({
  panel,
  onEdit,
  onDelete,
  onDownload,
}: {
  panel: Panel
  onEdit?: (panel: Panel) => void
  onDelete?: (panelId: string) => void
  onDownload?: (panel: Panel) => void
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
    <div
      ref={ref}
      className="absolute right-1 top-1 z-20 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <span className="panel-drag-handle cursor-grab rounded p-1 text-muted-foreground hover:bg-muted">
        <GripVertical className="size-3.5" />
      </span>
      <button
        type="button"
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
              type="button"
              onClick={() => {
                setOpen(false)
                onEdit(panel)
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
            >
              <Pencil className="size-3.5" /> Edit
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onDownload(panel)
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
            >
              <ImageDown className="size-3.5" /> Download Image
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onDelete(panel.id)
              }}
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

export function PanelBody({
  panel,
  data,
  preview = false,
}: {
  panel: Panel
  data: RunData | null | undefined
  preview?: boolean
}) {
  if (data === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    )
  }

  switch (panel.chartType) {
    case "kpi":
      return <KpiChart panel={panel} data={data} preview={preview} />
    case "filter":
      return <FilterChart panel={panel} data={data} preview={preview} />
    case "table":
    case "":
      return <TableChart panel={panel} data={data} preview={preview} />
    default:
      return <EChart panel={panel} data={data} preview={preview} />
  }
}
