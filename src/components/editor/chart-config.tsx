"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PanelEditor } from "@/app/(protected)/[id]/_components/use-panel-editor"
import { AxisDrop } from "@/app/(protected)/[id]/_components/axis-drop"

export function ChartConfig({ editor }: { editor: PanelEditor }) {
  const {
    chartType,
    columns, columnsLoading,
    xColumn, setXColumn,
    yColumn, setYColumn,
    yAgg, setYAgg,
  } = editor

  if (columnsLoading) {
    return <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Loading…</div>
  }
  if (!columns.length) {
    return <p className="text-[10px] text-muted-foreground">No columns</p>
  }

  if (chartType === "table") {
    return <TableConfig editor={editor} />
  }

  if (chartType === "text") {
    return <TextConfig editor={editor} />
  }

  if (chartType === "pivot") {
    return <p className="text-[10px] text-muted-foreground">Pivot uses first 3 columns: Label, Series, Value</p>
  }

  return (
    <div className="space-y-2">
      <AxisDrop label="X-Axis" column={columns[xColumn]} onChange={(idx) => setXColumn(idx)} />
      <AxisDrop label="Y-Axis" column={columns[yColumn]} agg={yAgg} onAggChange={setYAgg} onChange={(idx) => setYColumn(idx)} />
      {(chartType === "line" || chartType === "area") && <LineExtra editor={editor} />}
      {chartType === "pie" && <PieExtra editor={editor} />}
    </div>
  )
}

function LineExtra({ editor }: { editor: PanelEditor }) {
  const { lineFill, setLineFill } = editor
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] text-muted-foreground">Style</label>
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={() => setLineFill(false)}
          className={cn(
            "flex h-7 items-center justify-center rounded-md border text-[10px] transition-colors",
            !lineFill
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          Line
        </button>
        <button
          onClick={() => setLineFill(true)}
          className={cn(
            "flex h-7 items-center justify-center rounded-md border text-[10px] transition-colors",
            lineFill
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          Area
        </button>
      </div>
    </div>
  )
}

function TableConfig({ editor }: { editor: PanelEditor }) {
  const { columns, tableColumns, setTableColumns } = editor

  function toggle(colIdx: number) {
    const next = new Set(tableColumns)
    if (next.has(colIdx)) {
      next.delete(colIdx)
    } else {
      next.add(colIdx)
    }
    if (next.size === 0) {
      columns.forEach((_, i) => next.add(i))
    }
    setTableColumns(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] text-muted-foreground">Columns</label>
      <div className="max-h-32 overflow-auto rounded-md border p-1.5">
        {columns.map((col, i) => (
          <label key={i} className="flex items-center gap-1.5 py-0.5 text-[10px] cursor-pointer">
            <input
              type="checkbox"
              checked={tableColumns.has(i)}
              onChange={() => toggle(i)}
              className="accent-primary"
            />
            <span className="truncate">{col}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function PieExtra({ editor }: { editor: PanelEditor }) {
  const { pieMode, setPieMode, donutThickness, setDonutThickness } = editor

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] text-muted-foreground">Style</label>
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
  )
}

function TextConfig({ editor }: { editor: PanelEditor }) {
  const {
    panelText, setPanelText,
    panelTextLevel, setPanelTextLevel,
    panelTextColor, setPanelTextColor,
    panelTextAlign, setPanelTextAlign,
    panelTextVAlign, setPanelTextVAlign,
  } = editor

  return (
    <div className="space-y-3">
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
                "flex h-7 items-center justify-center rounded-md border text-[10px] capitalize transition-colors",
                panelTextLevel === lv
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-muted-foreground">Color</label>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={panelTextColor || "#000000"}
            onChange={(e) => setPanelTextColor(e.target.value)}
            className="size-7 cursor-pointer rounded border"
          />
          <input
            type="text"
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
    </div>
  )
}
