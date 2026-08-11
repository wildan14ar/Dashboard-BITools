"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { useContainerWidth } from "react-grid-layout"
import GridLayout, { type Layout } from "react-grid-layout"
import ReactECharts from "echarts-for-react"
import { Loader2, X } from "lucide-react"
import "react-grid-layout/css/styles.css"
import type { Dashboard, Panel } from "@/hooks/use-dashboards"
import { buildChartOption, type RunData } from "@/lib/chart"

type Props = {
  dashboard: Dashboard
  editable?: boolean
  layout?: Layout
  onLayoutChange?: (layout: Layout) => void
  onDeletePanel?: (panelId: string) => void
  className?: string
}

export default function DashboardGrid({ dashboard, editable = false, layout, onLayoutChange, onDeletePanel, className }: Props) {
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
    layout ??
    dashboard.panels.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h })) as unknown as Layout

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
            <div key={panel.id} className="flex h-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <span className="panel-drag-handle cursor-grab truncate text-sm font-medium">{panel.title}</span>
                {onDeletePanel && (
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onDeletePanel(panel.id)}
                    aria-label="Delete panel"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden p-2">
                {panel.dataSetId ? <PanelBody panel={panel} data={panelData[panel.id]} /> : (
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