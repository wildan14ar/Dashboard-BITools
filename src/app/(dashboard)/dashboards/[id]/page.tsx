"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import ReactECharts from "echarts-for-react"
import GridLayout from "react-grid-layout"
import { ArrowLeft, Edit3, Loader2, Filter, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import "react-grid-layout/css/styles.css"

type Panel = {
  id: string; title: string; chartType: string; config: Record<string, unknown> | null
  x: number; y: number; w: number; h: number; dataSetId: string | null
}
type FilterDef = { id: string; name: string; label: string; type: string; config: Record<string, unknown> | null }
type Dashboard = { id: string; name: string; panels: Panel[]; filters: FilterDef[] }

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

export default function ViewDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [panelData, setPanelData] = useState<Record<string, { columns: string[]; rows: { values: string[] }[] } | null>>({})
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [id, setId] = useState("")

  useEffect(() => { params.then((p) => { setId(p.id); loadData(p.id) }) }, [])

  async function loadData(dashboardId: string, filters?: Record<string, string>) {
    const { data } = await axios.get(`/api/dashboards/${dashboardId}`)
    setDashboard(data)
    setLoading(false)

    if (data.filters) {
      data.filters.forEach((f: FilterDef) => {
        if (!filterValues[f.name]) setFilterValues((p) => ({ ...p, [f.name]: "" }))
      })
    }

    for (const panel of data.panels) {
      if (panel.dataSetId) {
        try {
          const runRes = await axios.post(`/api/datasets/${panel.dataSetId}/run`, { params: filters ?? {} })
          setPanelData((p) => ({ ...p, [panel.id]: runRes.data }))
        } catch { /* pass */ }
      }
    }
  }

  function handleRefresh() {
    setPanelData({})
    loadData(id, filterValues)
  }

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>
  if (!dashboard) return null

  const layout = dashboard.panels.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h, static: true }))

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboards")}><ArrowLeft className="size-4" /></Button>
        <h1 className="text-lg font-semibold">{dashboard.name}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RotateCw className="size-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboards/${id}/edit`)}>
            <Edit3 className="size-3.5" /> Edit
          </Button>
        </div>
      </div>

      {dashboard.filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/20 px-6 py-2">
          <Filter className="size-3.5 text-muted-foreground" />
          {dashboard.filters.map((f) => (
            <label key={f.id} className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{f.label}</span>
              {f.type === "select" && f.config ? (
                <select
                  value={filterValues[f.name] ?? ""}
                  onChange={(e) => setFilterValues((p) => ({ ...p, [f.name]: e.target.value }))}
                  className="input h-7 w-32 text-xs"
                >
                  <option value="">All</option>
                  {(f.config as { options?: string[] }).options?.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  value={filterValues[f.name] ?? ""}
                  onChange={(e) => setFilterValues((p) => ({ ...p, [f.name]: e.target.value }))}
                  placeholder={f.label}
                  className="input h-7 w-40 text-xs"
                />
              )}
            </label>
          ))}
          <Button size="xs" variant="outline" onClick={handleRefresh}>Apply</Button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <GridLayout
          className="layout"
          layout={layout}
          gridConfig={{ cols: 12, rowHeight: 60 }}
          width={Math.min(window.innerWidth - 280, 1400)}
          dragConfig={{ enabled: false }}
          resizeConfig={{ enabled: false }}
        >
          {dashboard.panels.map((panel) => {
            const data = panelData[panel.id]
            const option = buildChartOption(panel, data)

            return (
              <div key={panel.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
                <div className="border-b px-3 py-1.5">
                  <h3 className="text-xs font-medium truncate">{panel.title}</h3>
                </div>
                <div className="h-[calc(100%-32px)]">
                  {panel.chartType === "table" && data ? (
                    <div className="h-full overflow-auto">
                      <table className="w-full text-[11px]">
                        <thead className="sticky top-0 bg-muted/50">
                          <tr>{data.columns.map((c) => <th key={c} className="border-b px-2 py-1 text-left font-medium">{c}</th>)}</tr>
                        </thead>
                        <tbody>
                          {data.rows.map((r, i) => (
                            <tr key={i} className="border-b">{r.values.map((v, j) => <td key={j} className="px-2 py-0.5 font-mono text-muted-foreground">{v}</td>)}</tr>
                          ))}
                        </tbody>
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
    </div>
  )
}
