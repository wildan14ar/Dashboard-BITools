"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export type DroppedField = { datasetId: string; datasetName: string; columnIndex: number }

export function AxisDrop({
  label,
  column,
  agg,
  onAggChange,
  onChange,
  onDropField,
}: {
  label: string
  column?: string
  agg?: string
  onAggChange?: (v: string) => void
  onChange: (idx: number) => void
  onDropField?: (field: DroppedField) => void
}) {
  const [over, setOver] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setOver(false)
    const datasetId = e.dataTransfer.getData("dataset-id")
    const columnIndex = e.dataTransfer.getData("column-index")
    if (datasetId) {
      onDropField?.({
        datasetId,
        datasetName: e.dataTransfer.getData("dataset-name"),
        columnIndex: Number(columnIndex) || 0,
      })
    } else if (columnIndex) {
      onChange(Number(columnIndex))
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <div className="flex gap-1">
        {agg && onAggChange && (
          <select
            value={agg}
            onChange={(e) => onAggChange(e.target.value)}
            className="h-8 w-16 rounded-md border bg-background px-1 text-[10px] shrink-0"
          >
            <option value="sum">SUM</option>
            <option value="avg">AVG</option>
            <option value="count">CNT</option>
            <option value="min">MIN</option>
            <option value="max">MAX</option>
          </select>
        )}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={handleDrop}
          className={cn(
            "h-8 flex-1 rounded-md border border-dashed px-2 flex items-center text-xs transition-colors",
            over ? "border-primary bg-primary/5" : "border-border",
            column ? "border-solid bg-muted/50" : "",
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
