"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import { Plus, Save, Send, Table2, BarChart3, LineChart, PieChart, AreaChart, Loader2, Layers, GripVertical, Target, Table, ChevronRight, ChevronDown, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboard, useCreatePanel, useUpdatePanel, useDeletePanel, useReorderPanels } from "@/hooks/use-dashboards"
import { useDatasets } from "@/hooks/use-datasets"
import type { Layout } from "react-grid-layout"
import DashboardGrid from "@/components/dashboard-grid"
import ReactECharts from "echarts-for-react"
import { buildChartOption } from "@/lib/chart"
import { cn } from "@/lib/utils"

const CHART_TYPES = [
  { value: "table", label: "Table", icon: Table2 },
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: LineChart },
  { value: "pie", label: "Pie", icon: PieChart },
  { value: "area", label: "Area", icon: AreaChart },
  { value: "kpi", label: "KPI", icon: Target },
  { value: "pivot", label: "Pivot", icon: Table },
  { value: "text", label: "Text", icon: Type },
]

export default function DashboardEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: dashboard, isLoading } = useDashboard(id)
  const { data: datasets = [] } = useDatasets()
  const createPanel = useCreatePanel(id)
  const updatePanel = useUpdatePanel(id)
  const deletePanel = useDeletePanel(id)
  const reorder = useReorderPanels(id)
  const [layout, setLayout] = useState<Layout | undefined>(undefined)
  const [dirty, setDirty] = useState(false)

  const [datasetId, setDatasetId] = useState("")
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null)
  const [chartType, setChartType] = useState("table")
  const [panelTitle, setPanelTitle] = useState("")
  const [xColumn, setXColumn] = useState(0)
  const [yColumn, setYColumn] = useState(0)
  const [yAgg, setYAgg] = useState("sum")
  const [panelText, setPanelText] = useState("")
  const [panelTextLevel, setPanelTextLevel] = useState("p")
  const [panelTextColor, setPanelTextColor] = useState("")
  const [panelTextAlign, setPanelTextAlign] = useState("left")
  const [columns, setColumns] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: { values: string[] }[] } | null>(null)
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set())
  const [datasetColumns, setDatasetColumns] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!datasetId) { setColumns([]); setPreviewData(null); return }
    let cancelled = false
    setColumnsLoading(true)
    axios
      .post(`/api/datasets/${datasetId}/run`, { pageSize: 10 })
      .then(({ data }) => {
        if (!cancelled && data?.columns) {
          setColumns(data.columns)
          setPreviewData(data)
        }
      })
      .finally(() => { if (!cancelled) setColumnsLoading(false) })
    return () => { cancelled = true }
  }, [datasetId])

  function toggleDatasetExpand(dsId: string) {
    setExpandedDatasets((prev) => {
      const next = new Set(prev)
      if (next.has(dsId)) { next.delete(dsId); return next }
      next.add(dsId)
      if (!datasetColumns[dsId]) {
        axios.post(`/api/datasets/${dsId}/run`, { pageSize: 1 }).then(({ data }) => {
          if (data?.columns) setDatasetColumns((p) => ({ ...p, [dsId]: data.columns }))
        })
      }
      return next
    })
  }

  const selectedDataset = datasets.find((d) => d.id === datasetId)

  useEffect(() => {
    if (selectedDataset && !panelTitle) setPanelTitle(selectedDataset.name)
  }, [selectedDataset, panelTitle])

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (!dashboard) return <div className="p-6 text-sm text-muted-foreground">Dashboard not found</div>

  const handleSave = () => {
    const currentLayout = layout ?? dashboard.panels!.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h }))
    const payload = dashboard.panels!.map((p) => {
      const item = currentLayout.find((l) => l.i === p.id)
      return item ? { id: p.id, x: item.x, y: item.y, w: item.w, h: item.h } : { id: p.id, x: p.x, y: p.y, w: p.w, h: p.h }
    })
    reorder.mutate(payload, { onSuccess: () => { setDirty(false); router.push(`/${id}`) } })
  }

  const handleAdd = () => {
    if (!datasetId && chartType !== "text") return
    const config = chartType === "text"
      ? { content: panelText, level: panelTextLevel, color: panelTextColor, align: panelTextAlign }
      : chartType !== "table" && chartType !== "kpi" && chartType !== "pivot" ? { xColumn, yColumn, yAgg } : {}
    const title = panelTitle || selectedDataset?.name || "Panel"

    if (editingPanelId) {
      const layoutItem = (layout ?? dashboard.panels!.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h })))
        .find((l) => l.i === editingPanelId)
      updatePanel.mutate({
        panelId: editingPanelId,
        dataSetId: datasetId || undefined,
        title,
        chartType,
        config,
        x: layoutItem?.x ?? 0,
        y: layoutItem?.y ?? 0,
        w: layoutItem?.w ?? 6,
        h: layoutItem?.h ?? 4,
      })
      setEditingPanelId(null)
    } else {
      createPanel.mutate({
        dataSetId: datasetId || undefined,
        title,
        chartType,
        config,
      })
    }
    setDatasetId("")
    setPanelTitle("")
    setPanelText("")
    setPanelTextLevel("p")
    setPanelTextColor("")
    setPanelTextAlign("left")
    setColumns([])
  }

  function handleEditPanel(panel: { id: string; title: string; chartType: string; dataSetId: string | null; config: Record<string, unknown> | null }) {
    const cfg = panel.config ?? {}
    setEditingPanelId(panel.id)
    setPanelTitle(panel.title)
    setChartType(panel.chartType)
    if (panel.chartType === "text") {
      setPanelText((cfg.content as string) ?? "")
      setPanelTextLevel((cfg.level as string) ?? "p")
      setPanelTextColor((cfg.color as string) ?? "")
      setPanelTextAlign((cfg.align as string) ?? "left")
      setDatasetId("")
    } else {
      setDatasetId(panel.dataSetId ?? "")
      setXColumn(Number(cfg.xColumn) || 0)
      setYColumn(Number(cfg.yColumn) || 0)
      setYAgg((cfg.yAgg as string) || "sum")
    }
  }

  function handleCancelEdit() {
    setEditingPanelId(null)
    setDatasetId("")
    setPanelTitle("")
    setPanelText("")
    setPanelTextLevel("p")
    setPanelTextColor("")
    setPanelTextAlign("left")
    setColumns([])
  }

  function selectDataset(dsId: string) {
    setDatasetId(dsId)
    setXColumn(0)
    setYColumn(0)
    setYAgg("sum")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dsId = e.dataTransfer.getData("dataset-id")
    const dsName = e.dataTransfer.getData("dataset-name")
    if (!dsId) return
    createPanel.mutate({
      dataSetId: dsId,
      title: dsName || "Panel",
      chartType: "table",
      config: {},
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">{dashboard.name}</h1>
          <span className="text-xs text-muted-foreground">{dashboard.panels?.length ?? 0} panels</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${id}`)}>
            <Send className="size-4" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || reorder.isPending}>
            <Save className="size-4" /> Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <DashboardGrid
            dashboard={dashboard}
            editable
            layout={layout}
            onLayoutChange={(l) => { setLayout(l as Layout); setDirty(true) }}
            onEditPanel={handleEditPanel}
            onDeletePanel={(panelId) => {
              deletePanel.mutate(panelId)
              setLayout((prev) => (prev ?? []).filter((item) => item.i !== panelId))
            }}
          />
        </div>

        {/* Chart Config Sidebar */}
        <aside className="w-64 border-l bg-muted/20 flex flex-col shrink-0 overflow-auto">
          <div className="border-b px-3 py-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chart Config</span>
          </div>

          <div className="p-3 space-y-3">
            {chartType === "text" ? (
              <div className="rounded-md border p-3 max-h-32 overflow-auto">
                <span className="text-[10px] text-muted-foreground block mb-1">{panelTitle}</span>
                <div
                  className="whitespace-pre-wrap"
                  style={{ color: panelTextColor || undefined, textAlign: panelTextAlign as "left" | "center" | "right" }}
                >
                  {panelTextLevel === "p"
                    ? <span className="text-xs">{panelText || "—"}</span>
                    : <DynamicHeading level={panelTextLevel}>{panelText || "—"}</DynamicHeading>}
                </div>
              </div>
            ) : previewData && previewData.rows.length > 0 ? (
              <ChartPreview chartType={chartType} data={previewData} config={{ xColumn, yColumn, yAgg }} title={panelTitle} />
            ) : (
              <div className="rounded-md border border-dashed h-24 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground/50">Select a dataset to preview</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-foreground">Title</label>
              <input
                value={panelTitle}
                onChange={(e) => setPanelTitle(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:border-ring"
                placeholder="Panel title"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-foreground">Chart Type</label>
              <div className="grid grid-cols-4 gap-1">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setChartType(ct.value)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-[10px] transition-colors",
                      chartType === ct.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <ct.icon className="size-3.5" />
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {chartType === "text" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-foreground">Content</label>
                  <textarea
                    value={panelText}
                    onChange={(e) => setPanelText(e.target.value)}
                    className="min-h-24 rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-ring resize-y"
                    placeholder="Write your text, markdown supported"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-foreground">Size / Heading</label>
                  <div className="grid grid-cols-4 gap-1">
                    {(["p", "h1", "h2", "h3", "h4", "h5", "h6"] as const).map((lv) => (
                      <button
                        key={lv}
                        onClick={() => setPanelTextLevel(lv)}
                        className={cn(
                          "flex h-7 items-center justify-center rounded-md border text-[10px] transition-colors",
                          panelTextLevel === lv
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {lv === "p" ? "T" : lv.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-foreground">Text Color</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={panelTextColor || "#09090b"}
                      onChange={(e) => setPanelTextColor(e.target.value)}
                      className="h-7 w-8 cursor-pointer rounded border bg-background p-0.5"
                    />
                    <input
                      value={panelTextColor}
                      onChange={(e) => setPanelTextColor(e.target.value)}
                      className="h-7 flex-1 rounded-md border bg-background px-2 text-[10px] font-mono outline-none focus:border-ring"
                      placeholder="#hex / color name"
                    />
                    {panelTextColor && (
                      <button onClick={() => setPanelTextColor("")} className="text-[10px] text-muted-foreground underline">
                        reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-foreground">Alignment</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["left", "center", "right"] as const).map((al) => (
                      <button
                        key={al}
                        onClick={() => setPanelTextAlign(al)}
                        className={cn(
                          "flex h-7 items-center justify-center rounded-md border text-[10px] capitalize transition-colors",
                          panelTextAlign === al
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {al}
                      </button>
                    ))}
                  </div>
                </div>

                <Button size="sm" className="w-full gap-1.5" onClick={handleAdd} disabled={createPanel.isPending || updatePanel.isPending}>
                  {editingPanelId ? <Save className="size-3.5" /> : <Plus className="size-3.5" />}
                  {editingPanelId ? "Update Panel" : "Add to Dashboard"}
                </Button>
                {editingPanelId && (
                  <Button size="sm" variant="outline" className="w-full" onClick={handleCancelEdit}>
                    Cancel Edit
                  </Button>
                )}
              </>
            ) : (
              <>
                {datasetId && (
                  <div className="flex items-center gap-2">
                    <Layers className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium truncate">{selectedDataset?.name ?? "Dataset"}</span>
                  </div>
                )}

                {chartType !== "table" && chartType !== "kpi" && chartType !== "pivot" && (
                  <div className="space-y-2">
                    {columnsLoading ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Loading…</div>
                    ) : (
                      <>
                        <AxisDrop label="X-Axis" column={columns[xColumn]} onChange={(idx) => setXColumn(idx)} />
                        <AxisDrop label="Y-Axis" column={columns[yColumn]} agg={yAgg} onAggChange={setYAgg} onChange={(idx) => setYColumn(idx)} />
                      </>
                    )}
                  </div>
                )}

                <Button size="sm" className="w-full gap-1.5" onClick={handleAdd} disabled={createPanel.isPending || updatePanel.isPending || !datasetId}>
                  {editingPanelId ? <Save className="size-3.5" /> : <Plus className="size-3.5" />}
                  {editingPanelId ? "Update Panel" : "Add to Dashboard"}
                </Button>
                {editingPanelId && (
                  <Button size="sm" variant="outline" className="w-full" onClick={handleCancelEdit}>
                    Cancel Edit
                  </Button>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Dataset Palette Sidebar */}
        <aside className="w-52 border-l bg-muted/20 flex flex-col shrink-0">
          <div className="border-b px-3 py-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Datasets</span>
          </div>

          <div className="flex-1 overflow-auto py-1">
            {datasets.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">No datasets</p>
            ) : (
              datasets.map((ds) => {
                const isExpanded = expandedDatasets.has(ds.id)
                const dsCols = datasetColumns[ds.id] ?? []
                return (
                  <div key={ds.id}>
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("dataset-id", ds.id)
                        e.dataTransfer.setData("dataset-name", ds.name)
                        e.dataTransfer.effectAllowed = "copy"
                      }}
                      onClick={() => selectDataset(ds.id)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1.5 text-xs transition-colors cursor-pointer group",
                        datasetId === ds.id
                          ? "bg-primary/10 text-primary border-l-2 border-l-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-l-transparent"
                      )}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDatasetExpand(ds.id) }}
                        className="p-0.5 shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        {isExpanded ? <ChevronDown className="size-2.5" /> : <ChevronRight className="size-2.5" />}
                      </button>
                      <span className="w-2.5 shrink-0 opacity-0 group-hover:opacity-0" />
                      <Layers className="size-3 shrink-0" />
                      <span className="truncate flex-1">{ds.name}</span>
                    </div>

                    {isExpanded && (
                      <div className="pl-8 pr-2 pb-1">
                        {dsCols.map((col, colIdx) => (
                          <div
                            key={col}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("column-index", String(colIdx))
                              e.dataTransfer.setData("column-name", col)
                              e.dataTransfer.effectAllowed = "move"
                            }}
                            className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 rounded-sm cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="size-2.5 shrink-0 opacity-30" />
                            <span className="truncate font-mono">{col}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function ChartPreview({ chartType, data, config, title }: {
  chartType: string
  data: { columns: string[]; rows: { values: string[] }[] }
  config: Record<string, unknown>
  title: string
}) {
  const rows = data.rows.map((r) => r.values)

  if (chartType === "table") {
    return (
      <div className="rounded-md border overflow-hidden max-h-32">
        <div className="bg-muted/50 px-2 py-1 text-[10px] font-medium truncate">{title}</div>
        <div className="overflow-auto max-h-24">
          <table className="w-full text-[9px]">
            <thead><tr className="border-b">{data.columns.map((c) => <th key={c} className="px-1.5 py-0.5 text-left">{c}</th>)}</tr></thead>
            <tbody>
              {rows.slice(0, 4).map((r, i) => (
                <tr key={i} className="border-b last:border-0">{r.map((v, j) => <td key={j} className="px-1.5 py-0.5">{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (chartType === "kpi") {
    const val = parseFloat(rows[0]?.[0]) || 0
    return (
      <div className="rounded-md border p-3 flex flex-col items-center justify-center">
        <span className="text-[10px] text-muted-foreground">{title}</span>
        <span className="text-xl font-bold">{val.toLocaleString()}</span>
      </div>
    )
  }

  if (chartType === "pivot") {
    return (
      <div className="rounded-md border overflow-hidden">
        <div className="bg-muted/50 px-2 py-1 text-[10px] font-medium">{title}</div>
        <div className="p-2 text-[10px] text-muted-foreground text-center">Pivot preview</div>
      </div>
    )
  }

  const option = buildChartOption(
    { chartType, config } as never,
    data
  )
  if (!option) return null

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="bg-muted/50 px-2 py-1 text-[10px] font-medium truncate">{title}</div>
      <ReactECharts option={option} notMerge style={{ height: 120, width: "100%" }} />
    </div>
  )
}

function DynamicHeading({ level, children }: { level: string; children: React.ReactNode }) {
  const Tag = level as keyof React.JSX.IntrinsicElements
  const sizeMap: Record<string, string> = {
    h1: "text-2xl font-bold",
    h2: "text-xl font-bold",
    h3: "text-lg font-semibold",
    h4: "text-base font-semibold",
    h5: "text-sm font-medium",
    h6: "text-xs font-medium",
  }
  return <Tag className={sizeMap[level] ?? "text-xs"}>{children}</Tag>
}

function AxisDrop({ label, column, agg, onAggChange, onChange }: {
  label: string
  column?: string
  agg?: string
  onAggChange?: (v: string) => void
  onChange: (idx: number) => void
}) {
  const [over, setOver] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <div className="flex gap-1">
        {agg && onAggChange && (
          <select value={agg} onChange={(e) => onAggChange(e.target.value)} className="h-8 w-16 rounded-md border bg-background px-1 text-[10px] shrink-0">
            <option value="sum">SUM</option>
            <option value="avg">AVG</option>
            <option value="count">CNT</option>
            <option value="min">MIN</option>
            <option value="max">MAX</option>
          </select>
        )}
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            const idx = e.dataTransfer.getData("column-index")
            if (idx) onChange(Number(idx))
          }}
          className={cn(
            "h-8 flex-1 rounded-md border border-dashed px-2 flex items-center text-xs transition-colors",
            over ? "border-primary bg-primary/5" : "border-border",
            column ? "border-solid bg-muted/50" : ""
          )}
        >
          {column ? (
            <span className="font-mono truncate">{column}</span>
          ) : (
            <span className="text-muted-foreground/50">Drop field</span>
          )}
        </div>
      </div>
    </div>
  )
}
