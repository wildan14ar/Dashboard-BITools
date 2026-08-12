"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Play, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDataset, useRunDataset } from "@/hooks/use-datasets"

export default function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEdit = searchParams.get("edit") === "1"

  const [id, setId] = useState("")
  const [sql, setSql] = useState("")
  const [name, setName] = useState("")
  const [result, setResult] = useState<{ columns: string[]; rows: { values: string[] }[]; rowCount: number; executionTimeMs: number; cached?: boolean; total?: number } | null>(null)
  const [error, setError] = useState("")
  const [useCache, setUseCache] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(0)

  const { data: dataset } = useDataset(id)
  const runDataset = useRunDataset(id)

  useEffect(() => { params.then((p) => setId(p.id)) }, [])

  const displayName = name || dataset?.name || ""
  const displaySql = sql || dataset?.sql || ""

  function runAt(nextPage: number) {
    setPage(nextPage)
    setError("")
    setResult(null)
    runDataset.mutate(
      { cache: useCache, page: nextPage, pageSize },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => setError(String(err)),
      }
    )
  }

  function handleRun() {
    runAt(page)
  }

  if (!dataset) return <div className="p-6 text-muted-foreground">Loading...</div>

  const totalPages = pageSize > 0 && result?.total != null ? Math.max(1, Math.ceil(result.total / pageSize)) : undefined

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/datasets")}><ArrowLeft className="size-4" /></Button>
        {isEdit ? (
          <input value={displayName} onChange={(e) => setName(e.target.value)} className="input w-64" />
        ) : (
          <h1 className="text-lg font-semibold">{dataset.name}</h1>
        )}
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={useCache} onChange={(e) => setUseCache(e.target.checked)} className="size-3.5 accent-primary" />
            Cache
          </label>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="input h-8 w-24 text-xs">
            <option value={0}>All rows</option>
            <option value={100}>100/page</option>
            <option value={500}>500/page</option>
            <option value={1000}>1000/page</option>
          </select>
          {pageSize > 0 && (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => runAt(page - 1)} disabled={page <= 1}>Prev</Button>
              <span className="text-xs text-muted-foreground">{totalPages ? `Page ${page} / ${totalPages}` : `Page ${page}`}</span>
              <Button variant="outline" size="sm" onClick={() => runAt(page + 1)} disabled={totalPages != null && page >= totalPages}>Next</Button>
            </div>
          )}
          <Button onClick={handleRun} disabled={runDataset.isPending}>
            {runDataset.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Run
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex flex-col border-r lg:w-1/2">
          <div className="border-b px-4 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">SQL Editor</span>
          </div>
          <textarea
            value={displaySql}
            onChange={(e) => setSql(e.target.value)}
            className="flex-1 resize-none border-0 bg-transparent p-4 font-mono text-sm outline-none"
            placeholder="SELECT * FROM ..."
            readOnly={!isEdit}
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col lg:w-1/2">
          <div className="flex items-center justify-between border-b px-4 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">Results</span>
            {result && (
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                {result.cached && <span className="font-medium text-emerald-500">cached</span>}
                <span className="flex items-center gap-1"><Clock className="size-3" />{result.executionTimeMs}ms</span>
                <span>{result.rowCount}{result.total != null ? ` / ${result.total}` : ""} rows</span>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {error && <div className="p-4 text-sm text-destructive">{error}</div>}
            {runDataset.isPending && <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Running query...</div>}
            {result && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/50">
                  <tr>
                    {result.columns.map((c) => (
                      <th key={c} className="border-b px-3 py-2 text-left font-medium whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      {row.values.map((v, j) => (
                        <td key={j} className="px-3 py-1.5 whitespace-nowrap font-mono text-muted-foreground">
                          {v ?? <span className="italic text-muted-foreground/50">NULL</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!error && !runDataset.isPending && !result && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Click Run to execute
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
