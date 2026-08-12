"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export function AxisDrop({ label, column, agg, onAggChange, onChange }: {
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
