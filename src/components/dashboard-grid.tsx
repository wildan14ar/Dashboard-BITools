"use client"

import { useEffect, useRef, useState } from "react"
import axios from "axios"
import { useContainerWidth } from "react-grid-layout"
import GridLayout, { type Layout } from "react-grid-layout"
import ReactECharts from "echarts-for-react"
import { Loader2, MoreVertical, Pencil, Trash2, GripVertical } from "lucide-react"
import "react-grid-layout/css/styles.css"
import type { Dashboard, Panel } from "@/hooks/use-dashboards"
import { buildChartOption, type RunData } from "@/lib/chart"
import { cn } from "@/lib/utils"

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
  const [panelData, setPanelData] = useState<Record<string, RunData | null>>({})

  useEffect(() => {
    if (!dashboard.panels?.length) return
    let cancelled = false
    const runAll = async () => {
      const results: Record<string, RunData | null> = {}
      await Promise.all(
        dashboard.panels!.map(async (panel) => {
          if (!panel.dataSetId) return
          try {
            const res = await axios.post(`/api/datasets/${panel.dataSetId}/run`, { cache: false })
            results[panel.id] = res.data ?? null
          } catch {
            results[panel.id] = null
          }
        })
      )
      if (!cancelled) setPanelData(results)
    }
    runAll()
    return () => {
      cancelled = true
    }
  }, [dashboard.panels])

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
          {dashboard.panels.map((panel) => (
            <div key={panel.id} className="group relative flex h-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
              {editable && (
                <PanelMenu
                  panel={panel}
                  onEdit={onEditPanel}
                  onDelete={onDeletePanel}
                />
              )}
              <div className="flex-1 overflow-hidden p-2">
                {panel.chartType === "text" ? (
                  <TextPanel panel={panel} />
                ) : panel.dataSetId ? <PanelBody panel={panel} data={panelData[panel.id]} /> : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No dataset</div>
                )}
              </div>
            </div>
          ))}
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

function TextPanel({ panel }: { panel: Panel }) {
  const config = (panel.config ?? {}) as { content?: string; level?: string; color?: string; align?: string }
  const content = config.content ?? ""
  const level = config.level ?? "p"
  const Tag = level === "p" ? "p" : (level as keyof React.JSX.IntrinsicElements)
  const sizeMap: Record<string, string> = {
    h1: "text-3xl font-bold",
    h2: "text-2xl font-bold",
    h3: "text-xl font-semibold",
    h4: "text-lg font-semibold",
    h5: "text-base font-medium",
    h6: "text-sm font-medium",
  }
  return (
    <div className="h-full overflow-auto p-1" style={{ color: config.color || undefined, textAlign: (config.align as "left" | "center" | "right") || undefined }}>
      <Tag className={`${level === "p" ? "text-sm" : sizeMap[level] ?? "text-sm"} whitespace-pre-wrap`}>{content}</Tag>
    </div>
  )
}

function PanelBody({ panel, data }: { panel: Panel; data: RunData | null | undefined }) {
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
  if (panel.chartType === "pivot") {
    const rows = data.rows.slice(0, 200)
    const cols = data.columns
    if (cols.length < 2) {
      return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Need at least 2 columns for pivot</div>
    }
    const groups = new Map<string, Map<string, number>>()
    const xVals = new Set<string>()
    for (const r of rows) {
      const k = r.values[0] ?? ""
      const vk = r.values[1] ?? ""
      const n = parseFloat(r.values[2] ?? "0") || 0
      xVals.add(vk)
      if (!groups.has(k)) groups.set(k, new Map())
      groups.get(k)!.set(vk, (groups.get(k)!.get(vk) ?? 0) + n)
    }
    const sortedX = [...xVals].sort()
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr className="border-b text-left">
              <th className="px-2 py-1 font-medium bg-muted/50 sticky left-0">{cols[0]}</th>
              {sortedX.map((x) => <th key={x} className="px-2 py-1 font-medium">{x}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...groups.entries()].map(([k, vals]) => (
              <tr key={k} className="border-b last:border-0">
                <td className="px-2 py-1 font-medium bg-muted/20 sticky left-0">{k}</td>
                {sortedX.map((x) => <td key={x} className="px-2 py-1">{vals.get(x) ?? 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (panel.chartType === "kpi") {
    const rows = data.rows
    if (rows.length === 0) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
    const val = parseFloat(rows[0].values[0]) || 0
    const label = data.columns[1] ?? data.columns[0] ?? "KPI"
    const prev = rows.length > 1 ? parseFloat(rows[1]?.values[0]) || 0 : null
    const delta = prev !== null ? ((val - prev) / (prev || 1)) * 100 : null
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-3xl font-bold mt-1">{val.toLocaleString()}</span>
        {delta !== null && (
          <span className={`text-xs mt-1 font-medium ${delta >= 0 ? "text-emerald-500" : "text-destructive"}`}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    )
  }

  if (panel.chartType === "table" || !panel.chartType) {
    const rows = data.rows.slice(0, 100)
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left">
              {data.columns.map((c) => (
                <th key={c} className="px-2 py-1 font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                {r.values.map((v, j) => (
                  <td key={j} className="px-2 py-1">{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  const option = buildChartOption(panel, data)
  if (!option) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
  return <ReactECharts option={option} notMerge style={{ height: "100%", width: "100%" }} />
}