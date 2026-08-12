"use client"

import { Plus, Save, Table2, BarChart3, LineChart, PieChart, AreaChart, Loader2, Layers, Target, Table, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AxisDrop } from "./axis-drop"
import { ChartPreview } from "./chart-preview"
import type { PanelEditor } from "./use-panel-editor"

const CHART_TYPES = [
  { value: "text", label: "Text", icon: Type },
  { value: "kpi", label: "KPI", icon: Target },
  { value: "table", label: "Table", icon: Table2 },
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: LineChart },
  { value: "pie", label: "Pie", icon: PieChart },
  { value: "area", label: "Area", icon: AreaChart },
  { value: "pivot", label: "Pivot", icon: Table },
]

export function ChartConfigSidebar({ editor }: { editor: PanelEditor }) {
  const {
    chartType, setChartType,
    panelTitle, setPanelTitle,
    datasetId, selectedDataset,
    xColumn, setXColumn,
    yColumn, setYColumn,
    yAgg, setYAgg,
    panelText, setPanelText,
    panelTextLevel, setPanelTextLevel,
    panelTextColor, setPanelTextColor,
    panelTextAlign, setPanelTextAlign,
    panelTextVAlign, setPanelTextVAlign,
    panelPadding, setPanelPadding,
    pieMode, setPieMode,
    donutThickness, setDonutThickness,
    columns, columnsLoading,
    tableColumns, setTableColumns,
    previewData,
    editingPanelId,
    createPanel, updatePanel,
    handleAdd, handleCancelEdit,
  } = editor

  return (
    <aside className="w-64 border-l bg-muted/20 flex flex-col shrink-0 overflow-auto">
      <div className="border-b px-3 py-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chart Config</span>
      </div>

      <div className="p-3 space-y-3">
        {chartType === "text" ? (
          <TextPreview
            content={panelText}
            level={panelTextLevel}
            color={panelTextColor}
            align={panelTextAlign}
            padding={panelPadding}
          />
        ) : previewData && previewData.rows.length > 0 ? (
          <ChartPreview
            chartType={chartType}
            data={previewData}
            config={{
              xColumn, yColumn, yAgg,
              pieMode, donutThickness,
              padding: panelPadding,
              columns: chartType === "table" ? [...tableColumns].sort((a, b) => a - b) : undefined,
            }}
            title={panelTitle}
          />
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

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-muted-foreground">Padding</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={32}
              step={2}
              value={panelPadding}
              onChange={(e) => setPanelPadding(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-primary"
            />
            <span className="w-8 text-right text-xs tabular-nums">{panelPadding}px</span>
          </div>
        </div>

        {chartType === "text" ? (
          <TextConfig
            editor={editor}
          />
        ) : (
          <>
            {datasetId && (
              <div className="flex items-center gap-2">
                <Layers className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium truncate">{selectedDataset?.name ?? "Dataset"}</span>
              </div>
            )}

            {chartType === "kpi" ? (
              <div className="space-y-2">
                {columnsLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Loading…</div>
                ) : columns.length > 0 ? (
                  <AxisDrop label="Value" column={columns[yColumn]} agg={yAgg} onAggChange={setYAgg} onChange={(idx) => setYColumn(idx)} />
                ) : (
                  <p className="text-[10px] text-muted-foreground">No columns</p>
                )}
              </div>
            ) : chartType === "table" ? (
              <TableConfig
                columns={columns}
                columnsLoading={columnsLoading}
                tableColumns={tableColumns}
                setTableColumns={setTableColumns}
              />
            ) : chartType !== "pivot" && (
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

            {chartType === "pie" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-muted-foreground">Pie Style</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setPieMode("donut")}
                    className={cn(
                      "flex h-7 items-center justify-center rounded-md border text-[10px] transition-colors",
                      pieMode === "donut"
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Donut
                  </button>
                  <button
                    onClick={() => setPieMode("pie")}
                    className={cn(
                      "flex h-7 items-center justify-center rounded-md border text-[10px] transition-colors",
                      pieMode === "pie"
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Full Pie
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={10}
                    max={80}
                    step={1}
                    value={donutThickness}
                    onChange={(e) => setDonutThickness(Number(e.target.value))}
                    className="h-1.5 flex-1 cursor-pointer accent-primary"
                  />
                  <span className="w-8 text-right text-xs tabular-nums">{donutThickness}%</span>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  {pieMode === "donut" ? "Thickness of the donut ring" : "Outer radius of the pie"}
                </p>
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
  )
}

function TextPreview({ content, level, color, align, padding }: {
  content: string
  level: string
  color: string
  align: string
  padding: number
}) {
  return (
    <div className="rounded border overflow-hidden">
      <div
        className="max-h-32 overflow-auto whitespace-pre-wrap"
        style={{
          padding,
          color: color || undefined,
          textAlign: align as "left" | "center" | "right",
        }}
      >
        {level === "p"
          ? <span className="text-xs">{content}</span>
          : <DynamicHeading level={level}>{content}</DynamicHeading>}
      </div>
    </div>
  )
}

function TextConfig({ editor }: { editor: PanelEditor }) {
  const {
    panelText, setPanelText,
    panelTextLevel, setPanelTextLevel,
    panelTextColor, setPanelTextColor,
    panelTextAlign, setPanelTextAlign,
    panelTextVAlign, setPanelTextVAlign,
    editingPanelId,
    createPanel, updatePanel,
    handleAdd, handleCancelEdit,
  } = editor

  return (
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

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-muted-foreground">Vertical Alignment</label>
        <div className="grid grid-cols-3 gap-1">
          {(["top", "center", "bottom"] as const).map((va) => (
            <button
              key={va}
              onClick={() => setPanelTextVAlign(va)}
              className={cn(
                "flex h-7 items-center justify-center rounded-md border text-[10px] capitalize transition-colors",
                panelTextVAlign === va
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {va}
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
  )
}

function TableConfig({ columns, columnsLoading, tableColumns, setTableColumns }: {
  columns: string[]
  columnsLoading: boolean
  tableColumns: Set<number>
  setTableColumns: (fn: (prev: Set<number>) => Set<number>) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-muted-foreground">Columns</label>
        <button
          onClick={() => {
            if (tableColumns.size === columns.length) setTableColumns(() => new Set())
            else setTableColumns(() => new Set(columns.map((_: string, i: number) => i)))
          }}
          className="text-[10px] text-muted-foreground underline"
        >
          {tableColumns.size === columns.length ? "clear" : "select all"}
        </button>
      </div>
      {columnsLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Loading…</div>
      ) : columns.length > 0 ? (
        <div className="max-h-40 overflow-auto rounded-md border divide-y">
          {columns.map((col, i) => (
            <label key={col} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={tableColumns.has(i)}
                onChange={() => {
                  setTableColumns((prev) => {
                    const next = new Set(prev)
                    if (next.has(i)) next.delete(i)
                    else next.add(i)
                    return next
                  })
                }}
                className="size-3.5 accent-primary"
              />
              <span className="truncate font-mono">{col}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">No columns</p>
      )}
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
