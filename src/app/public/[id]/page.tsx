"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import ReactECharts from "echarts-for-react"
import GridLayout from "react-grid-layout"
import { Loader2 } from "lucide-react"
import "@/components/react-grid.css"
import { useDashboard, type Panel } from "@/hooks/use-dashboards"

const CHART_COLORS = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4"]

function buildChartOption(panel: Panel, data: { columns: string[]; rows: { values: string[] }[] } | null) {
  if (!data || data.rows.length === 0) return null
  const rows = data.rows.map((r) => r.values)
  const cfg = (panel.config as Record<string, unknown>) ?? {}
  if (panel.chartType === "table") return null
  const xIdx = (cfg.xColumn as number) ?? 0
  const yIdx = (cfg.yColumn as number) ?? 1
  return {
    color: CHART_COLORS,
    tooltip: { trigger: "axis" as const },
    grid: { left: 40, right: 10, top: 10, bottom: 24 },
    xAxis: { type: "category" as const, data: rows.map((r) => r[xIdx] ?? ""), axisLabel: { fontSize: 10 } },
    yAxis: { type: "value" as const, axisLabel: { fontSize: 10 } },
    series: [{ type: panel.chartType as never, data: rows.map((r) => parseFloat(r[yIdx]) || 0), smooth: true }],
  }
}

export default function PublicDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const { data: dashboard, isLoading } = useDashboard(id)
  const [panelData, setPanelData] = useState<Record<string, { columns: string[]; rows: { values: string[] }[] } | null>>({})

  useEffect(() => {
    if (!dashboard?.panels) return
    for (const panel of dashboard.panels) {
      if (panel.dataSetId) {
        axios.post(`/api/datasets/${panel.dataSetId}/run`).then((r) => setPanelData((p) => ({ ...p, [panel.id]: r.data }))).catch(() => {})
      }
    }
  }, [dashboard])

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>
  if (!dashboard?.isPublic) return <div className="flex h-screen items-center justify-center text-muted-foreground">Dashboard not found or not public</div>

  const layout = dashboard.panels!.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h, static: true }))

  return (
    <div className="h-screen bg-muted/10 p-4">
      <div className="mb-3"><h1 className="text-lg font-semibold">{dashboard.name}</h1></div>
      <GridLayout className="layout" layout={layout} gridConfig={{ cols: 12, rowHeight: 60 }} width={window.innerWidth - 32} dragConfig={{ enabled: false }} resizeConfig={{ enabled: false }}>
        {dashboard.panels!.map((panel) => {
          const data = panelData[panel.id]
          const option = buildChartOption(panel, data)
          return (
            <div key={panel.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className="border-b px-3 py-1.5"><h3 className="text-xs font-medium truncate">{panel.title}</h3></div>
              <div className="h-[calc(100%-32px)]">
                {panel.chartType === "table" && data ? (
                  <div className="h-full overflow-auto">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-muted/50"><tr>{data.columns.map((c) => <th key={c} className="border-b px-2 py-1 text-left font-medium">{c}</th>)}</tr></thead>
                      <tbody>{data.rows.map((r, i) => <tr key={i} className="border-b">{r.values.map((v, j) => <td key={j} className="px-2 py-0.5 font-mono text-muted-foreground">{v}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                ) : option ? (
                  <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
                )}
              </div>
            </div>
          )
        })}
      </GridLayout>
    </div>
  )
}
