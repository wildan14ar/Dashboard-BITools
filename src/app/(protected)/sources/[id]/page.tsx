"use client"

import { use, useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import Editor from "@monaco-editor/react"
import {
  ArrowLeft, Play, Loader2, X, Table2, Database, Eye,
  ChevronRight, KeyRound, ArrowRightLeft, Search, Columns, GitBranch,
  Plus, MoreVertical, Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useSource, useSourceSchema, type TableItem, type ColumnInfo } from "@/hooks/use-sources"
import { useCreateDataset } from "@/hooks/use-datasets"
import { SchemaERD } from "@/components/schema-erd"

type QueryResult = { columns: string[]; rows: { values: string[] }[]; rowCount: number; executionTimeMs: number } | null
type TabKind = "table" | "query" | "erd"
type TabDef = { id: string; kind: TabKind; label: string; sql?: string; erdSchema?: string }
type TabState = { result: QueryResult; error: string; running: boolean }

export default function SourceSchemaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const { data: source, isLoading: sourceLoading } = useSource(id)
  const { data: schema = [], isLoading: schemaLoading } = useSourceSchema(id)

  const [tabs, setTabs] = useState<TabDef[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({})
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [editorHeight, setEditorHeight] = useState(200)
  const [menuSchema, setMenuSchema] = useState<string | null>(null)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const [isResizingEditor, setIsResizingEditor] = useState(false)

  const schemas = useMemo(() => {
    const map = new Map<string, TableItem[]>()
    for (const t of schema) {
      const s = t.schema || "public"
      if (!map.has(s)) map.set(s, [])
      map.get(s)!.push(t)
    }
    for (const [, tables] of map) tables.sort((a, b) => a.name.localeCompare(b.name))
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [schema])

  const filteredSchemas = useMemo(() => {
    if (!searchTerm) return schemas
    const q = searchTerm.toLowerCase()
    return schemas
      .map(([sn, tables]) => [sn, tables.filter((t) => t.name.toLowerCase().includes(q))] as const)
      .filter(([, tables]) => tables.length > 0)
  }, [schemas, searchTerm])

  function getState(tabId: string): TabState {
    return tabStates[tabId] ?? { result: null, error: "", running: false }
  }

  function setState(tabId: string, update: Partial<TabState>) {
    setTabStates((p) => ({ ...p, [tabId]: { ...getState(tabId), ...update } }))
  }

  function openTab(table: TableItem) {
    const tabId = `tbl:${table.name}`
    const label = `${table.schema !== "public" ? table.schema + "." : ""}${table.name}`
    if (!tabs.find((t) => t.id === tabId)) {
      setTabs((p) => [...p, { id: tabId, kind: "table", label, sql: `SELECT * FROM ${label}` }])
    }
    setActiveTab(tabId)
  }

  function openQueryTab() {
    const idx = tabs.filter((t) => t.kind === "query").length + 1
    const tabId = `q:${idx}`
    setTabs((p) => [...p, { id: tabId, kind: "query", label: `Query ${idx}`, sql: "SELECT " }])
    setActiveTab(tabId)
  }

  function openErdTab(erdSchema: string, label: string) {
    const tabId = `erd:${erdSchema}`
    if (!tabs.find((t) => t.id === tabId)) {
      setTabs((p) => [...p, { id: tabId, kind: "erd", label, erdSchema }])
    }
    setActiveTab(tabId)
  }

  function closeTab(tabId: string) {
    setTabs((p) => p.filter((t) => t.id !== tabId))
    setTabStates((p) => {
      const next = { ...p }
      delete next[tabId]
      return next
    })
    if (activeTab === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId)
      const remaining = tabs.filter((t) => t.id !== tabId)
      if (remaining.length > 0) setActiveTab(remaining[Math.min(idx, remaining.length - 1)].id)
      else setActiveTab(null)
    }
  }

  async function handleRun(tabId: string) {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab || !tab.sql) return
    setState(tabId, { running: true, error: "", result: null })
    try {
      const { data } = await axios.post(`/api/sources/${id}/run`, { sql: tab.sql })
      if (data?.error) setState(tabId, { error: data.error, running: false })
      else if (data?.columns && data?.rows) setState(tabId, { result: data, running: false })
      else setState(tabId, { error: "Unexpected empty response", running: false })
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const ax = err as { response?: { data?: { error?: string } } }
        setState(tabId, { error: ax.response?.data?.error ?? "Request failed", running: false })
      } else {
        setState(tabId, { error: err instanceof Error ? err.message : String(err), running: false })
      }
    }
  }

  function toggleSchema(sn: string) {
    setExpandedSchemas((p) => {
      const next = new Set(p)
      if (next.has(sn)) next.delete(sn); else next.add(sn)
      return next
    })
  }

  function toggleTableColumns(sn: string, tableName: string) {
    const key = `${sn}.${tableName}`
    setExpandedTables((p) => {
      const next = new Set(p)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  useEffect(() => {
    if (!activeTab) return
    const tab = tabs.find((t) => t.id === activeTab)
    if (tab && tab.kind === "table" && !getState(activeTab).result && !getState(activeTab).error && !getState(activeTab).running) {
      handleRun(activeTab)
    }
  }, [activeTab])

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isResizingSidebar) setSidebarWidth(Math.max(180, Math.min(500, e.clientX)))
      if (isResizingEditor) setEditorHeight(Math.max(80, Math.min(600, window.innerHeight - e.clientY - 120)))
    }
    function handleMouseUp() {
      setIsResizingSidebar(false)
      setIsResizingEditor(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    if (isResizingSidebar || isResizingEditor) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = isResizingSidebar ? "col-resize" : "row-resize"
      document.body.style.userSelect = "none"
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizingSidebar, isResizingEditor])

  if (sourceLoading) return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>

  const activeTabObj = activeTab ? tabs.find((t) => t.id === activeTab) : null
  const activeState = activeTab ? getState(activeTab) : null

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        source={source}
        onBack={() => router.back()}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          width={sidebarWidth}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          schemaLoading={schemaLoading}
          filteredSchemas={filteredSchemas}
          expandedSchemas={expandedSchemas}
          expandedTables={expandedTables}
          menuSchema={menuSchema}
          onToggleSchema={toggleSchema}
          onToggleTableColumns={toggleTableColumns}
          onOpenTab={openTab}
          onOpenMenu={(sn) => setMenuSchema(menuSchema === sn ? null : sn)}
          onNewQuery={() => { setMenuSchema(null); openQueryTab() }}
          onViewErd={(sn) => { setMenuSchema(null); openErdTab(sn, sn) }}
          onResizeStart={() => setIsResizingSidebar(true)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} onClose={closeTab} onNewQuery={openQueryTab} />

          {activeTabObj ? (
            activeTabObj.kind === "erd" ? (
              <ErdView tab={activeTabObj} schema={schema} />
            ) : (
              <EditorArea
                tab={activeTabObj}
                state={activeState!}
                sourceId={id}
                onSqlChange={(sql) => setTabs((p) => p.map((t) => t.id === activeTab ? { ...t, sql } : t))}
                onRun={() => handleRun(activeTab!)}
                editorHeight={editorHeight}
                onEditorResizeStart={() => setIsResizingEditor(true)}
              />
            )
          ) : (
            <EmptyState onNewQuery={openQueryTab} tableCount={schema.length} />
          )}
        </div>
      </div>
    </div>
  )
}

function Toolbar({ source, onBack }: {
  source: { name: string; type: string } | null | undefined
  onBack: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5 shrink-0">
      <Button variant="ghost" size="icon" className="size-7" onClick={onBack}>
        <ArrowLeft className="size-3.5" />
      </Button>

      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Database className="size-3.5 text-muted-foreground" />
        <span className="truncate max-w-[200px]">{source?.name ?? "Source"}</span>
      </div>

      <span className="text-[10px] text-muted-foreground uppercase tracking-wider ml-1 px-1 py-0.5 border rounded">
        {source?.type ?? ""}
      </span>
    </div>
  )
}

function Sidebar({ width, searchTerm, onSearchChange, schemaLoading, filteredSchemas, expandedSchemas, expandedTables, menuSchema, onToggleSchema, onToggleTableColumns, onOpenTab, onOpenMenu, onNewQuery, onViewErd, onResizeStart }: {
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

function TabBar({ tabs, activeTab, onSelect, onClose, onNewQuery }: {
  tabs: TabDef[]
  activeTab: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNewQuery: () => void
}) {
  if (tabs.length === 0) return null
  return (
    <div className="flex items-center border-b bg-muted/20 shrink-0 overflow-x-auto overflow-y-hidden">
      {tabs.map((t) => (
        <div key={t.id} className={cn("group flex items-center border-r shrink-0 pr-0.5 cursor-pointer", activeTab === t.id && "border-b-2 border-b-primary bg-background -mb-px")} onClick={() => onSelect(t.id)}>
          <span className="px-3 py-1.5 text-[11px] font-medium whitespace-nowrap">
            {t.kind === "table" && <Table2 className="inline size-3 mr-1" />}
            {t.kind === "query" && <Columns className="inline size-3 mr-1" />}
            {t.kind === "erd" && <GitBranch className="inline size-3 mr-1" />}
            {t.label}
          </span>
          <button onClick={(e) => { e.stopPropagation(); onClose(t.id) }} className="p-0.5 mr-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100">
            <X className="size-3" />
          </button>
        </div>
      ))}
      <button
        onClick={onNewQuery}
        className="shrink-0 p-1 mx-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        title="New Query"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

function ErdView({ tab, schema }: { tab: TabDef; schema: TableItem[] }) {
  const tables = useMemo(() => {
    if (!tab.erdSchema || tab.erdSchema === "*") return schema
    return schema.filter((t) => (t.schema || "public") === tab.erdSchema)
  }, [schema, tab.erdSchema])

  return (
    <div className="flex-1 h-full overflow-hidden">
      <SchemaERD tables={tables} />
    </div>
  )
}

function EditorArea({ tab, state, sourceId, onSqlChange, onRun, editorHeight, onEditorResizeStart }: {
  tab: TabDef
  state: TabState
  sourceId: string
  onSqlChange: (sql: string) => void
  onRun: () => void
  editorHeight: number
  onEditorResizeStart: () => void
}) {
  const [theme, setTheme] = useState<"vs-dark" | "vs">("vs-dark")
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState("")
  const createDataset = useCreateDataset()

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    function update() { setTheme(mq.matches ? "vs" : "vs-dark") }
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0" style={{ height: editorHeight }}>
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={tab.sql}
          onChange={(v) => onSqlChange(v ?? "")}
          onMount={(editor) => {
            editor.addAction({
              id: "run-query",
              label: "Run Query",
              keybindings: [2048 | 3], // Ctrl+Enter
              run: () => onRun(),
            })
          }}
          theme={theme}
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
            fontSize: 13,
            lineHeight: 22,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            automaticLayout: true,
            suggest: { showWords: false },
            wordBasedSuggestions: "off",
            quickSuggestions: false,
          }}
        />
      </div>

      <div
        className="h-1 bg-border cursor-row-resize hover:bg-primary/30 shrink-0"
        onMouseDown={(e) => { e.preventDefault(); onEditorResizeStart() }}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="flex items-center gap-2 border-b px-3 py-1 shrink-0">
          {state.result && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {state.result.columns.length} col · {state.result.rowCount.toLocaleString()} rows · {state.result.executionTimeMs}ms
            </span>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={() => { setSaveName(tab.label); setSaveOpen(true) }}
          >
            <Save className="size-3" /> Save
          </Button>
          <Button
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={onRun}
            disabled={state.running}
          >
            {state.running ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
            Run
          </Button>
        </div>

        <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} title="Save to Dataset">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!saveName.trim()) return
              createDataset.mutate({ name: saveName.trim(), sql: tab.sql ?? "", sourceId })
              setSaveOpen(false)
            }}
            className="flex flex-col gap-4 min-w-[320px]"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus:border-ring"
                placeholder="Dataset name"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSaveOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={createDataset.isPending}>
                {createDataset.isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                Save Dataset
              </Button>
            </div>
          </form>
        </Dialog>

        <div className="flex-1 overflow-auto">
          {state.error && (
            <div className="p-4"><div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs text-destructive">{state.error}</div></div>
          )}
          {state.running && (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Executing query...</div>
          )}
          {state.result && (
            <div className="overflow-auto">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 z-20 bg-muted border-b border-r px-2 py-1.5 text-left text-[10px] font-medium text-muted-foreground w-8 select-none">#</th>
                    {state.result.columns.map((c) => <th key={c} className="border-b bg-muted px-3 py-1.5 text-left text-[10px] font-semibold whitespace-nowrap">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {state.result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="sticky left-0 bg-background border-r px-2 py-1 text-[10px] text-muted-foreground/50 text-right select-none">{i + 1}</td>
                      {row.values.map((v, j) => (
                        <td key={j} className="px-3 py-1 font-mono text-[11px] whitespace-nowrap max-w-[400px] truncate">{v == null ? <span className="italic text-muted-foreground/40">NULL</span> : v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!state.result && !state.error && !state.running && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground/50">Press Ctrl+Enter to execute</div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onNewQuery, tableCount }: { onNewQuery: () => void; tableCount: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
      <Database className="size-12 opacity-15" />
      <div className="text-center">
        <p className="font-medium">Database Explorer</p>
        <p className="text-xs opacity-60 mt-1">{tableCount > 0 ? "Select a table or use the toolbar" : "No objects available"}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onNewQuery} className="gap-1.5 mt-2"><Plus className="size-3.5" /> New Query</Button>
    </div>
  )
}
