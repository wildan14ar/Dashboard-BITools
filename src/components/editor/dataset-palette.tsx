"use client"

import { Layers, ChevronRight, ChevronDown, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PanelEditor } from "@/hooks/use-panel-editor"

export function DatasetPalette({ editor }: { editor: PanelEditor }) {
  const { datasets, expandedDatasets, datasetColumns, toggleDatasetExpand } = editor

  return (
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
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 text-xs transition-colors cursor-grab active:cursor-grabbing group",
                    "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Layers className="size-3 shrink-0" />
                  <span className="truncate flex-1">{ds.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleDatasetExpand(ds.id) }}
                    className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] hover:bg-muted shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="size-2.5" /> : <ChevronRight className="size-2.5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="pl-5 pr-2 pb-1">
                    {dsCols.map((col, colIdx) => (
                      <div
                        key={col}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("dataset-id", ds.id)
                          e.dataTransfer.setData("dataset-name", ds.name)
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
  )
}
