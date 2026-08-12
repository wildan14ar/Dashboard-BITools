"use client"

import { useState } from "react"
import { Plus, Save, Table2, BarChart3, PieChart, Target, Type, LineChart, GripVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AxisDrop } from "./axis-drop"
import { ChartPreview } from "./chart-preview"
import { Field, FieldLabel, Segmented, OptionButton, ColorField, RangeField } from "./controls"
import { Heading } from "@/components/charts/heading"
import type { PanelEditor } from "@/hooks/use-panel-editor"

const CHART_TYPES = [
  { value: "text", label: "Text", icon: Type },
  { value: "kpi", label: "KPI", icon: Target },
  { value: "table", label: "Table", icon: Table2 },
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: LineChart },
  { value: "pie", label: "Pie", icon: PieChart },
]

const LEVELS = ["p", "h1", "h2", "h3", "h4", "h5", "h6"] as const
const ALIGNMENTS = [
  { value: "left" as const, label: "Left" },
  { value: "center" as const, label: "Center" },
  { value: "right" as const, label: "Right" },
]
const VALIGNMENTS = [
  { value: "top" as const, label: "Top" },
  { value: "center" as const, label: "Center" },
  { value: "bottom" as const, label: "Bottom" },
]

export function ChartConfigSidebar({ editor }: { editor: PanelEditor }) {
  const {
    chartType, setChartType,
    panelTitle, setPanelTitle,
    panelPadding, setPanelPadding,
    titlePosition, setTitlePosition,
    titleAlign, titleBold, titleItalic, titleStrikethrough, titleColor, titleSize,
    pieMode, donutThickness, lineFill, barOrientation, xColumn, yColumn, yAgg, tableColumns, tableScroll,
    previewData,
  } = editor

  const chartConfig = chartType === "kpi"
    ? { column: yColumn, agg: yAgg }
    : chartType === "table"
      ? { columns: tableColumns, tableScroll }
      : chartType === "pie"
        ? { xColumn, yColumn, yAgg, pieMode, donutThickness }
        : { xColumn, yColumn, yAgg, lineFill, barOrientation }

  return (
    <aside className="w-64 border-l bg-muted/20 flex flex-col shrink-0 overflow-auto">
      <div className="border-b px-3 py-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chart Config</span>
      </div>

      <div className="p-3 space-y-3">
        {chartType === "text" ? (
          <TextPreview editor={editor} />
        ) : previewData && previewData.rows.length > 0 ? (
          <ChartPreview
            chartType={chartType}
            data={previewData}
            title={panelTitle}
            chartConfig={chartConfig}
            config={{
              titlePosition,
              titleAlign,
              titleBold,
              titleItalic,
              titleStrikethrough,
              titleColor,
              titleSize,
              padding: panelPadding,
            }}
          />
        ) : (
          <div className="rounded-md border border-dashed h-24 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/50">Select a dataset to preview</span>
          </div>
        )}

        <Field label="Chart Type">
          <div className="grid grid-cols-6 gap-1">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setChartType(ct.value)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-[9px] transition-colors",
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
        </Field>

        {chartType !== "text" && (
          <>
            <Field label="Title">
              <input
                value={panelTitle}
                onChange={(e) => setPanelTitle(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:border-ring"
                placeholder="Panel title"
              />
            </Field>

            <Field label="Position">
              <Segmented value={titlePosition} onChange={setTitlePosition} columns={3} options={POSITIONS} />
              {titlePosition !== "none" && (
                <TitlePositionEditor editor={editor} />
              )}
            </Field>

            <Field label="Padding">
              <RangeField value={panelPadding} onChange={setPanelPadding} min={0} max={32} step={2} suffix="px" />
            </Field>
          </>
        )}

        {chartType === "text" ? (
          <TextConfig editor={editor} />
        ) : (
          <NonTextConfig editor={editor} />
        )}
      </div>
    </aside>
  )
}

const POSITIONS = [
  { value: "none" as const, label: "None" },
  { value: "top" as const, label: "Top" },
  { value: "bottom" as const, label: "Bottom" },
]

function TitlePositionEditor({ editor }: { editor: PanelEditor }) {
  const {
    titleAlign, setTitleAlign,
    titleBold, setTitleBold,
    titleItalic, setTitleItalic,
    titleStrikethrough, setTitleStrikethrough,
    titleColor, setTitleColor,
    titleSize, setTitleSize,
  } = editor

  return (
    <>
      <Segmented value={titleAlign} onChange={setTitleAlign} columns={3} options={ALIGNMENTS} />
      <div className="flex items-center gap-2">
        <OptionButton active={titleBold} onClick={() => setTitleBold(!titleBold)} className="w-7 font-bold">B</OptionButton>
        <OptionButton active={titleItalic} onClick={() => setTitleItalic(!titleItalic)} className="w-7 italic">I</OptionButton>
        <OptionButton active={titleStrikethrough} onClick={() => setTitleStrikethrough(!titleStrikethrough)} className="w-7 line-through">S</OptionButton>
        <div className="flex items-center gap-1 flex-1">
          <input
            type="color"
            value={titleColor || "#000000"}
            onChange={(e) => setTitleColor(e.target.value)}
            className="size-7 cursor-pointer rounded border"
          />
          <input
            type="number"
            min={8}
            max={32}
            value={titleSize}
            onChange={(e) => setTitleSize(Number(e.target.value))}
            className="h-7 w-12 rounded-md border bg-background px-1 text-[10px] outline-none"
          />
        </div>
      </div>
    </>
  )
}

function NonTextConfig({ editor }: { editor: PanelEditor }) {
  const { chartType } = editor

  return (
    <>
      {chartType === "kpi" ? (
        <KpiConfig editor={editor} />
      ) : chartType === "table" ? (
        <TableConfig editor={editor} />
      ) : (
        <ChartConfig editor={editor} />
      )}

      {chartType === "bar" && <BarConfig editor={editor} />}
      {chartType === "line" && <LineConfig editor={editor} />}
      {chartType === "pie" && <PieConfig editor={editor} />}

      <PanelActionButtons editor={editor} requireDataset />
    </>
  )
}

function KpiConfig({ editor }: { editor: PanelEditor }) {
  const { columns, selectDataset, yColumn, setYColumn, yAgg, setYAgg } = editor
  return (
    <AxisDrop
      label="Value"
      column={columns[yColumn]}
      agg={yAgg}
      onAggChange={setYAgg}
      onChange={(idx) => setYColumn(idx)}
      onDropField={(f) => { selectDataset(f.datasetId); setYColumn(f.columnIndex) }}
    />
  )
}

function ChartConfig({ editor }: { editor: PanelEditor }) {
  const { columns, selectDataset, xColumn, setXColumn, yColumn, setYColumn, yAgg, setYAgg } = editor
  return (
    <div className="space-y-3">
      <AxisDrop label="X-Axis" column={columns[xColumn]} onChange={(idx) => setXColumn(idx)} onDropField={(f) => { selectDataset(f.datasetId); setXColumn(f.columnIndex) }} />
      <AxisDrop label="Y-Axis" column={columns[yColumn]} agg={yAgg} onAggChange={setYAgg} onChange={(idx) => setYColumn(idx)} onDropField={(f) => { selectDataset(f.datasetId); setYColumn(f.columnIndex) }} />
    </div>
  )
}

function LineConfig({ editor }: { editor: PanelEditor }) {
  const { lineFill, setLineFill } = editor
  return (
    <Field label="Style">
      <Segmented value={lineFill ? "area" : "line"} onChange={(v) => setLineFill(v === "area")} columns={2} options={LINE_OPTIONS} />
    </Field>
  )
}

const LINE_OPTIONS = [
  { value: "line" as const, label: "Line" },
  { value: "area" as const, label: "Area" },
]

function BarConfig({ editor }: { editor: PanelEditor }) {
  const { barOrientation, setBarOrientation } = editor
  return (
    <Field label="Style">
      <Segmented value={barOrientation} onChange={setBarOrientation} columns={2} options={BAR_ORIENTATION_OPTIONS} />
    </Field>
  )
}

const BAR_ORIENTATION_OPTIONS = [
  { value: "vertical" as const, label: "Vertical" },
  { value: "horizontal" as const, label: "Horizontal" },
]

function PieConfig({ editor }: { editor: PanelEditor }) {
  const { pieMode, setPieMode, donutThickness, setDonutThickness } = editor
  return (
    <Field label="Style">
      <Segmented value={pieMode} onChange={setPieMode} columns={2} options={PIE_OPTIONS} />
      <RangeField value={donutThickness} onChange={setDonutThickness} min={10} max={80} step={1} suffix="%" />
      <p className="text-[9px] text-muted-foreground">
        {pieMode === "donut" ? "Thickness of the donut ring" : "Outer radius of the pie"}
      </p>
    </Field>
  )
}

const PIE_OPTIONS = [
  { value: "donut" as const, label: "Donut" },
  { value: "pie" as const, label: "Full Pie" },
]

function TextPreview({ editor }: { editor: PanelEditor }) {
  const { panelText, panelTextLevel, panelTextColor, panelTextAlign, panelPadding } = editor
  return (
    <div className="rounded border overflow-hidden">
      <div
        className="max-h-32 overflow-auto whitespace-pre-wrap"
        style={{
          padding: panelPadding,
          color: panelTextColor || undefined,
          textAlign: panelTextAlign as "left" | "center" | "right",
        }}
      >
        <Heading level={panelTextLevel}>{panelText}</Heading>
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
  } = editor

  return (
    <>
      <Field label="Content">
        <textarea
          value={panelText}
          onChange={(e) => setPanelText(e.target.value)}
          className="min-h-24 rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-ring resize-y"
          placeholder="Write your text, markdown supported"
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Segmented value={panelTextLevel} onChange={setPanelTextLevel} columns={7} options={LEVELS.map((lv) => ({ value: lv, label: lv === "p" ? "T" : lv.toUpperCase() }))} />
      </div>

      <Field label="Text Color">
        <ColorField value={panelTextColor} onChange={setPanelTextColor} onReset={() => setPanelTextColor("")} />
      </Field>

      <Field label="Alignment">
        <Segmented value={panelTextAlign} onChange={setPanelTextAlign} columns={3} options={ALIGNMENTS} />
      </Field>

      <Field label="Vertical Alignment">
        <Segmented value={panelTextVAlign} onChange={setPanelTextVAlign} columns={3} options={VALIGNMENTS} />
      </Field>

      <PanelActionButtons editor={editor} />
    </>
  )
}

const SCROLL_OPTIONS = [
  { value: "vertical" as const, label: "Vertical" },
  { value: "horizontal" as const, label: "Horizontal" },
]

function TableConfig({ editor }: { editor: PanelEditor }) {
  const { columns, tableColumns, setTableColumns, tableScroll, setTableScroll, datasetId, selectDataset } = editor
  const [over, setOver] = useState(false)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setOver(false)
    const dsId = e.dataTransfer.getData("dataset-id")
    const colIdx = Number(e.dataTransfer.getData("column-index"))
    if (dsId && dsId !== datasetId) {
      selectDataset(dsId)
    } else if (!Number.isNaN(colIdx) && !tableColumns.includes(colIdx)) {
      setTableColumns((prev) => [...prev, colIdx])
    }
  }

  const removeColumn = (idx: number) => {
    setTableColumns((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveColumn = (from: number, to: number) => {
    setTableColumns((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

return (
    <>
      <Field label="Columns">
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex h-8 items-center rounded-md border border-dashed px-2 text-[10px] transition-colors",
            over ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground/50"
          )}
        >
          Drop column field to add
        </div>
        {tableColumns.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">No columns selected — drop a field above</p>
        ) : (
          <div className="flex flex-col gap-1">
            {tableColumns.map((colIdx, i) => {
              const col = columns[colIdx] ?? `#${colIdx}`
              return (
                <div
                  key={colIdx}
                  draggable
                  onDragStart={(e) => {
                    setDraggingIdx(i)
                    e.dataTransfer.setData("text/plain", String(i))
                    e.dataTransfer.effectAllowed = "move"
                  }}
                  onDragEnd={() => setDraggingIdx(null)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move" }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const from = Number(e.dataTransfer.getData("text/plain"))
                    if (!Number.isNaN(from)) moveColumn(from, i)
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing",
                    draggingIdx === i ? "opacity-50" : ""
                  )}
                >
                  <GripVertical className="size-3 shrink-0 opacity-40" />
                  <span className="truncate flex-1 font-mono">{col}</span>
                  <button
                    type="button"
                    onClick={() => removeColumn(i)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Field>
      <Field label="Scroll">
        <Segmented value={tableScroll} onChange={setTableScroll} columns={2} options={SCROLL_OPTIONS} />
      </Field>
    </>
  )
}

function PanelActionButtons({ editor, requireDataset = false }: { editor: PanelEditor; requireDataset?: boolean }) {
  const { editingPanelId, createPanel, updatePanel, datasetId, handleAdd, handleCancelEdit } = editor
  const disabled = createPanel.isPending || updatePanel.isPending || (requireDataset && !datasetId)
  return (
    <>
      <Button size="sm" className="w-full gap-1.5" onClick={handleAdd} disabled={disabled}>
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