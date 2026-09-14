"use client"

import { ArrowLeft, Columns, Database, GitBranch, Plus, Table2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { use, useCallback, useEffect, useMemo, useState } from "react"
import { QueryEditorArea } from "@/components/sources/query-editor"
import type { QueryResult, TabDef, TabState } from "@/components/sources/query-types"
import { SchemaERD } from "@/components/sources/schema-erd"
import { SchemaSidebar } from "@/components/sources/schema-sidebar"
import { Button } from "@/components/ui/button"
import { type TableItem, useSource, useSourceSchema } from "@/hooks/use-sources"
import api from "@/lib/api"
import { cn } from "@/lib/utils"

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

  const getState = useCallback(
    (tabId: string): TabState => {
      return tabStates[tabId] ?? { result: null, error: "", running: false }
    },
    [tabStates],
  )

  const setState = useCallback((tabId: string, update: Partial<TabState>) => {
    setTabStates((p) => ({
      ...p,
      [tabId]: { ...(p[tabId] ?? { result: null, error: "", running: false }), ...update },
    }))
  }, [])

  function openTab(table: TableItem) {
    const tabId = `tbl:${table.name}`
    const label = `${table.schema !== "public" ? `${table.schema}.` : ""}${table.name}`
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

  const handleRun = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab?.sql) return
      setState(tabId, { running: true, error: "", result: null })
      try {
        const res = await api.post<QueryResult & { error?: string }>(`/sources/${id}/run`, {
          sql: tab.sql,
        })
        const data = res.data
        if (data?.error) setState(tabId, { error: data.error, running: false })
        else if (data?.columns && data?.rows) setState(tabId, { result: data, running: false })
        else setState(tabId, { error: "Unexpected empty response", running: false })
      } catch (err: unknown) {
        setState(tabId, { error: err instanceof Error ? err.message : String(err), running: false })
      }
    },
    [tabs, id, setState],
  )

  function toggleSchema(sn: string) {
    setExpandedSchemas((p) => {
      const next = new Set(p)
      if (next.has(sn)) next.delete(sn)
      else next.add(sn)
      return next
    })
  }

  function toggleTableColumns(sn: string, tableName: string) {
    const key = `${sn}.${tableName}`
    setExpandedTables((p) => {
      const next = new Set(p)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    if (!activeTab) return
    const tab = tabs.find((t) => t.id === activeTab)
    if (
      tab &&
      tab.kind === "table" &&
      !getState(activeTab).result &&
      !getState(activeTab).error &&
      !getState(activeTab).running
    ) {
      handleRun(activeTab)
    }
  }, [activeTab, tabs, getState, handleRun])

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isResizingSidebar) setSidebarWidth(Math.max(180, Math.min(500, e.clientX)))
      if (isResizingEditor)
        setEditorHeight(Math.max(80, Math.min(600, window.innerHeight - e.clientY - 120)))
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

  if (sourceLoading)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )

  const activeTabObj = activeTab ? tabs.find((t) => t.id === activeTab) : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5 shrink-0">
        <Button variant="ghost" size="icon" className="size-7" onClick={() => router.back()}>
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

      <div className="flex flex-1 overflow-hidden">
        <SchemaSidebar
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
          onNewQuery={() => {
            setMenuSchema(null)
            openQueryTab()
          }}
          onViewErd={(sn) => {
            setMenuSchema(null)
            openErdTab(sn, sn)
          }}
          onResizeStart={() => setIsResizingSidebar(true)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
            onClose={closeTab}
            onNewQuery={openQueryTab}
          />

          {activeTabObj ? (
            activeTabObj.kind === "erd" ? (
              <ErdView tab={activeTabObj} schema={schema} />
            ) : (
              <QueryEditorArea
                tab={activeTabObj}
                state={getState(activeTabObj.id)}
                sourceId={id}
                onSqlChange={(sql) =>
                  setTabs((p) => p.map((t) => (t.id === activeTab ? { ...t, sql } : t)))
                }
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

function TabBar({
  tabs,
  activeTab,
  onSelect,
  onClose,
  onNewQuery,
}: {
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
        <div
          key={t.id}
          role="tab"
          aria-selected={activeTab === t.id}
          tabIndex={0}
          className={cn(
            "group flex items-center border-r shrink-0 pr-0.5 cursor-pointer",
            activeTab === t.id && "border-b-2 border-b-primary bg-background -mb-px",
          )}
          onClick={() => onSelect(t.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onSelect(t.id)
            }
          }}
        >
          <span className="px-3 py-1.5 text-[11px] font-medium whitespace-nowrap">
            {t.kind === "table" && <Table2 className="inline size-3 mr-1" />}
            {t.kind === "query" && <Columns className="inline size-3 mr-1" />}
            {t.kind === "erd" && <GitBranch className="inline size-3 mr-1" />}
            {t.label}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose(t.id)
            }}
            className="p-0.5 mr-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
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

function EmptyState({ onNewQuery, tableCount }: { onNewQuery: () => void; tableCount: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
      <Database className="size-12 opacity-15" />
      <div className="text-center">
        <p className="font-medium">Database Explorer</p>
        <p className="text-xs opacity-60 mt-1">
          {tableCount > 0 ? "Select a table or use the toolbar" : "No objects available"}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onNewQuery} className="gap-1.5 mt-2">
        <Plus className="size-3.5" /> New Query
      </Button>
    </div>
  )
}
