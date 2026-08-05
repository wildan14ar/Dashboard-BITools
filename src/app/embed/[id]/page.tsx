"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import ReactECharts from "echarts-for-react"
import GridLayout from "react-grid-layout"
import { Loader2 } from "lucide-react"
import "react-grid-layout/css/styles.css"

type Panel = {
  id: string; title: string; chartType: string; config: Record<string, unknown> | null
  x: number; y: number; w: number; h: number; dataSetId: string | null
}
type Dashboard = { id: string; name: string; panels: Panel[]; isPublic: boolean }

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
    grid: { left: 30, right: 6, top: 6, bottom: 20 },
    xAxis: { type: "category" as const, data: rows.map((r) => r[xIdx] ?? ""), axisLabel: { fontSize: 9 } },
    yAxis: { type: "value" as const, axisLabel: { fontSize: 9 } },
    series: [{ type: panel.chartType as never, data: rows.map((r) => parseFloat(r[yIdx]) || 0), smooth: true }],
  }
}

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [panelData, setPanelData] = useState<Record<string, { columns: string[]; rows: { values: string[] }[] } | null>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData(id) }, [])

  async function loadData(dashboardId: string) {
    const { data } = await axios.get(`/api/dashboards/${dashboardId}`)
    setDashboard(data)
    setLoading(false)
    for (const panel of data.panels) {
      if (panel.dataSetId) {
        try {
          const runRes = await axios.post(`/api/datasets/${panel.dataSetId}/run`)
          setPanelData((p) => ({ ...p, [panel.id]: runRes.data }))
        } catch { /* pass */ }
      }
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="size-5 animate-spin" /></div>
  if (!dashboard) return null

  const layout = dashboard.panels.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h, static: true }))

  return (
    <div className="h-screen bg-background p-2" style={{ margin: 0, overflow: "hidden" }}>
      <GridLayout className="layout" layout={layout} gridConfig={{ cols: 12, rowHeight: 50 }} width={window.innerWidth - 8} dragConfig={{ enabled: false }} resizeConfig={{ enabled: false }}>
        {dashboard.panels.map((panel) => {
          const data = panelData[panel.id]
          const option = buildChartOption(panel, data)
          return (
            <div key={panel.id} className="overflow-hidden rounded border bg-card">
              <div className="px-2 py-0.5"><h3 className="text-[10px] font-medium truncate">{panel.title}</h3></div>
              <div className="h-[calc(100%-20px)]">
                {panel.chartType === "table" && data ? (
                  <div className="h-full overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead className="sticky top-0 bg-muted/50"><tr>{data.columns.map((c) => <th key={c} className="border-b px-1.5 py-0.5 text-left font-medium">{c}</th>)}</tr></thead>
                      <tbody>{data.rows.map((r, i) => <tr key={i} className="border-b">{r.values.map((v, j) => <td key={j} className="px-1.5 py-0.5 font-mono text-muted-foreground">{v}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                ) : option ? (
                  <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No data</div>
                )}
              </div>
            </div>
          )
        })}
      </GridLayout>
    </div>
  )
}
