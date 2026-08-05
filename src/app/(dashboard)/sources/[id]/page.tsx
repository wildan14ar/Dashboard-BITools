"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { ArrowLeft, ChevronRight, Table2, Columns3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ColumnInfo = { name: string; type: string; nullable: boolean }
type TableInfo = { name: string; schema: string; columns: ColumnInfo[] }

export default function SourceSchemaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [source, setSource] = useState<{ name: string } | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [id, setId] = useState("")

  useEffect(() => { params.then((p) => { setId(p.id); loadData(p.id) }) }, [])

  async function loadData(sourceId: string) {
    try {
      setLoading(true)
      const [srcRes, schemaRes] = await Promise.all([
        axios.get(`/api/sources/${sourceId}`),
        axios.get(`/api/sources/${sourceId}/schema`),
      ])
      setSource(srcRes.data)
      setTables(schemaRes.data.tables ?? [])
    } catch {
      setError("Failed to load schema")
    }
    setLoading(false)
  }

  function toggle(name: string) {
    setExpanded((p) => {
      const next = new Set(p)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading schema...</div>
  if (error) return <div className="p-6 text-destructive">{error}</div>

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">{source?.name ?? "Source"}</h1>
      </div>

      {tables.length === 0 ? (
        <p className="text-muted-foreground">No tables found</p>
      ) : (
        <div className="space-y-1">
          {tables.map((t) => {
            const open = expanded.has(t.name)
            return (
              <div key={t.name} className="rounded-lg border">
                <button
                  onClick={() => toggle(t.name)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")} />
                  <Table2 className="size-4 shrink-0 text-muted-foreground" />
                  {t.name}
                  <span className="ml-auto text-xs text-muted-foreground">{t.columns.length} columns</span>
                </button>
                {open && (
                  <div className="border-t bg-muted/20 px-7 py-1.5">
                    {t.columns.map((c) => (
                      <div key={c.name} className="flex items-center gap-2 py-1 text-xs">
                        <Columns3 className="size-3 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{c.name}</span>
                        <code className="rounded bg-muted px-1 text-[11px]">{c.type}</code>
                        {c.nullable && <span className="text-muted-foreground">nullable</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
