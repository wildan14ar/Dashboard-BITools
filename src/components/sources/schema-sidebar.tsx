"use client"

import { useEffect } from "react"
import {
  X, Table2, Database, Eye, ChevronRight, KeyRound,
  ArrowRightLeft, Search, GitBranch, Plus, MoreVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { TableItem, ColumnInfo } from "@/hooks/use-sources"

export function SchemaSidebar({ width, searchTerm, onSearchChange, schemaLoading, filteredSchemas, expandedSchemas, expandedTables, menuSchema, onToggleSchema, onToggleTableColumns, onOpenTab, onOpenMenu, onNewQuery, onViewErd, onResizeStart }: {
  width: number
  searchTerm: string
  onSearchChange: (v: string) => void
  schemaLoading: boolean
  filteredSchemas: readonly (readonly [string, TableItem[]])[]
  expandedSchemas: Set<string>
  expandedTables: Set<string>
  menuSchema: string | null
  onToggleSchema: (sn: string) => void
  onToggleTableColumns: (sn: string, tableName: string) => void
  onOpenTab: (t: TableItem) => void
  onOpenMenu: (sn: string) => void
  onNewQuery: () => void
  onViewErd: (sn: string) => void
  onResizeStart: () => void
}) {
  useEffect(() => {
    if (!menuSchema) return
    function close() { onOpenMenu("") }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [menuSchema, onOpenMenu])

  return (
    <div className="flex shrink-0 flex-col border-r bg-muted/20 relative" style={{ width }}>
      <div className="border-b px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1">
          <Search className="size-3 text-muted-foreground shrink-0" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter tables..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
          {searchTerm && (
            <button onClick={() => onSearchChange("")} className="text-muted-foreground hover:text-foreground">
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto select-none">
        {schemaLoading ? (
          <div className="px-2 py-2 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1">
                <div className="size-3 rounded bg-muted-foreground/15 animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted-foreground/10 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredSchemas.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">No objects found</div>
        ) : (
          filteredSchemas.map(([sn, tables]) => (
            <div key={sn}>
              <div className="flex items-center group hover:bg-muted/50 pr-1">
                <button onClick={() => onToggleSchema(sn)} className="flex flex-1 items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                  <ChevronRight className={cn("size-3 shrink-0 transition-transform", expandedSchemas.has(sn) && "rotate-90")} />
                  <Database className="size-3 shrink-0" />
                  <span className="truncate">{sn}</span>
                </button>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenMenu(sn) }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={cn("p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted", menuSchema === sn && "opacity-100 bg-muted")}
                  >
                    <MoreVertical className="size-3.5" />
                  </button>
                  {menuSchema === sn && (
                    <div className="absolute right-0 top-full z-50 min-w-[130px] rounded-md border bg-popover shadow-md p-1 text-xs" onMouseDown={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); onNewQuery() }} className="flex w-full items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                        <Plus className="size-3.5" /> New Query
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onViewErd(sn) }} className="flex w-full items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                        <GitBranch className="size-3.5" /> View Diagram
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {expandedSchemas.has(sn) && (
                <div>
                  {tables.map((t) => {
                    const treeKey = `${sn}.${t.name}`
                    const isExpanded = expandedTables.has(treeKey)
                    return (
                      <div key={t.name}>
                        <button
                          onClick={() => onOpenTab(t)}
                          onDoubleClick={() => onToggleTableColumns(sn, t.name)}
                          className="flex w-full items-center gap-1.5 pl-7 pr-2 py-0.5 text-xs hover:bg-muted/50 group"
                        >
                          <span
                            onClick={(e) => { e.stopPropagation(); onToggleTableColumns(sn, t.name) }}
                            className="p-0.5 opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                          >
                            <ChevronRight className={cn("size-2.5 transition-transform", isExpanded && "rotate-90")} />
                          </span>
                          <span className="w-3 shrink-0 flex justify-center">
                            {t.type === "view" ? <Eye className="size-3 text-blue-400" /> : <Table2 className="size-3 text-emerald-500" />}
                          </span>
                          <span className="truncate font-mono text-[11px]">{t.name}</span>
                        </button>
                        {isExpanded && (
                          <div className="pl-11 pr-2 pb-0.5">
                            {t.columns.map((col) => <ColumnTreeItem key={col.name} col={col} />)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 z-10"
        onMouseDown={(e) => { e.preventDefault(); onResizeStart() }}
        style={{ left: width - 2 }}
      />
    </div>
  )
}

function ColumnTreeItem({ col }: { col: ColumnInfo }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 rounded-sm group">
      <span className="w-3 shrink-0 flex justify-center">
        {col.isPrimaryKey ? <KeyRound className="size-2.5 text-amber-500" /> : col.foreignKey ? <ArrowRightLeft className="size-2.5 text-blue-400" /> : <span className="w-2.5" />}
      </span>
      <span className="truncate font-mono">{col.name}</span>
      {col.foreignKey && <span className="text-[9px] text-blue-400/70 truncate hidden group-hover:inline ml-auto">→ {col.foreignKey.table}.{col.foreignKey.column}</span>}
      <span className="ml-auto text-[9px] opacity-50 shrink-0">{col.type}</span>
      {col.nullable && <span className="text-[8px] opacity-30 shrink-0">N</span>}
    </div>
  )
}
