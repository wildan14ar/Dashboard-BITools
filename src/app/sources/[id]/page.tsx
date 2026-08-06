"use client"

import { use, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { ArrowLeft, Play, Clock, Loader2, X, Table2, ChevronRight, Database, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSource, useSourceSchema, type TableItem } from "@/hooks/use-sources"
import { SchemaERD } from "@/components/schema-erd"

type QueryResult = { columns: string[]; rows: { values: string[] }[]; rowCount: number; executionTimeMs: number } | null
type TabDef = { id: string; label: string; sql: string }
type TabState = { result: QueryResult; error: string; running: boolean }

export default function SourceSchemaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const { data: source, isLoading: sourceLoading } = useSource(id)
  const { data: schema = [] } = useSourceSchema(id)

  const [tabs, setTabs] = useState<TabDef[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({})
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())

  const schemas = useMemo(() => {
    const map = new Map<string, TableItem[]>()
    for (const t of schema) {
      const s = t.schema || "public"
      if (!map.has(s)) map.set(s, [])
      map.get(s)!.push(t)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [schema])

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
      setTabs((p) => [...p, { id: tabId, label, sql: `SELECT * FROM ${label} LIMIT 50` }])
    }
    setActiveTab(tabId)
  }

  function closeTab(tabId: string) {
    setTabs((p) => p.filter((t) => t.id !== tabId))
    if (activeTab === tabId) setActiveTab(null)
  }

  async function handleRun(tabId: string) {
    const st = getState(tabId)
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
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

  function toggleSchema(schemaName: string) {
    setExpandedSchemas((p) => {
      const next = new Set(p)
      if (next.has(schemaName)) next.delete(schemaName); else next.add(schemaName)
      return next
    })
  }

  if (sourceLoading) return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <h1 className="text-sm font-semibold">{source?.name ?? "Source"}</h1>
        <span className="text-xs text-muted-foreground">{schema.length} objects</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 border-r flex flex-col shrink-0 bg-muted/20">
          <div className="border-b px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Database</span>
          </div>
          <div className="flex-1 overflow-auto py-1">
            {schemas.map(([schemaName, tables]) => (
              <div key={schemaName}>
                <button onClick={() => toggleSchema(schemaName)} className="flex w-full items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronRight className={cn("size-3 shrink-0 transition-transform", expandedSchemas.has(schemaName) && "rotate-90")} />
                  <Database className="size-3 shrink-0" />
                  <span className="truncate">{schemaName}</span>
                </button>
                {expandedSchemas.has(schemaName) && tables.map((t) => (
                  <button key={t.name} onClick={() => openTab(t)} className="flex w-full items-center gap-1.5 pl-10 pr-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30">
                    {t.type === "view" ? <Eye className="size-3 shrink-0 text-blue-400" /> : <Table2 className="size-3 shrink-0" />}
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {tabs.length > 0 && (
            <div className="flex items-center border-b bg-muted/20 shrink-0 overflow-x-auto">
              {tabs.map((t) => (
                <div key={t.id} className={cn("group flex items-center border-r shrink-0 pr-1", activeTab === t.id && "border-b-2 border-b-primary bg-background -mb-px")}>
                  <button onClick={() => setActiveTab(t.id)} className="px-3 py-1.5 text-xs font-medium whitespace-nowrap">
                    {t.label}
                  </button>
                  <button onClick={() => closeTab(t.id)} className="p-0.5 opacity-0 group-hover:opacity-100 rounded hover:bg-muted"><X className="size-3" /></button>
                </div>
              ))}
            </div>
          )}

          {activeTab ? (
            <TabContent tab={tabs.find((t) => t.id === activeTab)!} state={getState(activeTab)} onRun={() => handleRun(activeTab)} onSqlChange={(sql) => setTabs((p) => p.map((t) => t.id === activeTab ? { ...t, sql } : t))} schema={schema} />
          ) : (
            <div className="flex flex-1">
              <div className="w-1/2 border-r">
                <SchemaERD tables={schema} />
              </div>
              <div className="w-1/2 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <Database className="size-8 opacity-20" />
                <span>Select a table to query</span>
                <span className="text-xs opacity-50">or browse the ERD on the left</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabContent({ tab, state, onRun, onSqlChange, schema }: { tab: TabDef; state: TabState; onRun: () => void; onSqlChange: (sql: string) => void; schema: TableItem[] }) {
  return (
    <div className="flex flex-1">
      <div className="w-1/2 border-r">
        <SchemaERD tables={schema} />
      </div>
      <div className="w-1/2 flex flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-1 shrink-0">
          <Button size="xs" onClick={onRun} disabled={state.running}>
            {state.running ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />} Run
          </Button>
          {state.result && <span className="text-xs text-muted-foreground"><Clock className="inline size-3 mr-0.5" />{state.result.executionTimeMs}ms · {state.result.rowCount} rows</span>}
        </div>
        <textarea value={tab.sql} onChange={(e) => onSqlChange(e.target.value)} rows={4} className="resize-none border-b bg-transparent px-4 py-2 font-mono text-sm outline-none shrink-0" placeholder="SELECT * FROM ..." spellCheck={false} />
        <div className="flex-1 overflow-auto">
          {state.error && <div className="p-4 text-sm text-destructive">{state.error}</div>}
          {state.running && <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Running...</div>}
          {state.result && (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/50">
                <tr>{state.result.columns.map((c) => <th key={c} className="border-b px-3 py-2 text-left font-medium whitespace-nowrap">{c}</th>)}</tr>
              </thead>
              <tbody>
                {state.result.rows.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    {row.values.map((v, j) => <td key={j} className="px-3 py-1.5 whitespace-nowrap font-mono text-muted-foreground">{v ?? <span className="italic text-muted-foreground/50">NULL</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
