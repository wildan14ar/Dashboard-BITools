"use client"

import { ArrowLeft, Clock, Loader2, Play, Save } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Protected } from "@/components/Protected"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useDataset, useRunDataset, useUpdateDataset } from "@/hooks/use-datasets"
import type { RunData } from "@/lib/chart"

function DatasetDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEdit = searchParams.get("edit") === "1"

  const [sql, setSql] = useState("")
  const [name, setName] = useState("")
  const [result, setResult] = useState<RunData | null>(null)
  const [error, setError] = useState("")
  const [useCache, setUseCache] = useState(true)
  const [saved, setSaved] = useState(false)

  const { data: dataset } = useDataset(id)
  const runDataset = useRunDataset()
  const updateDataset = useUpdateDataset()

  const displayName = name || dataset?.name || ""
  const displaySql = sql || dataset?.sql || ""
  const dirty = (name && name !== dataset?.name) || (sql && sql !== dataset?.sql)

  function handleRun() {
    setError("")
    setResult(null)
    runDataset.mutate(
      { datasetId: id, cache: useCache },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => setError(err instanceof Error ? err.message : String(err)),
      },
    )
  }

  function handleSave() {
    if (!dirty) return
    setSaved(false)
    updateDataset.mutate(
      {
        id,
        ...(name && name !== dataset?.name ? { name } : {}),
        ...(sql && sql !== dataset?.sql ? { sql } : {}),
      },
      { onSuccess: () => setSaved(true) },
    )
  }

  if (!dataset) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/datasets")}>
          <ArrowLeft className="size-4" />
        </Button>
        {isEdit ? (
          <Input value={displayName} onChange={(e) => setName(e.target.value)} className="w-64" />
        ) : (
          <h1 className="text-lg font-semibold">{dataset.name}</h1>
        )}
        <div className="ml-auto flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 dark:text-green-400">Tersimpan</span>}
          {isEdit && (
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={!dirty || updateDataset.isPending}
            >
              {updateDataset.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
          )}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={useCache}
              onChange={(e) => setUseCache(e.target.checked)}
              className="size-3.5 accent-primary"
            />
            Cache
          </label>
          <Button onClick={handleRun} disabled={runDataset.isPending}>
            {runDataset.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Run
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex flex-col border-r lg:w-1/2">
          <div className="border-b px-4 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">SQL Editor</span>
          </div>
          <Textarea
            value={displaySql}
            onChange={(e) => setSql(e.target.value)}
            className="flex-1 resize-none border-0 bg-transparent p-4 font-mono text-sm shadow-none focus-visible:ring-0"
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
                {typeof result.execution_time_ms === "number" && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {result.execution_time_ms}ms
                  </span>
                )}
                {typeof result.row_count === "number" && <span>{result.row_count} rows</span>}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {error && <div className="p-4 text-sm text-destructive">{error}</div>}
            {runDataset.isPending && (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Running query...
              </div>
            )}
            {result && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/50">
                  <tr>
                    {result.columns.map((c) => (
                      <th
                        key={c}
                        className="border-b px-3 py-2 text-left font-medium whitespace-nowrap"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      {row.values.map((v, j) => (
                        <td
                          key={j}
                          className="px-3 py-1.5 whitespace-nowrap font-mono text-muted-foreground"
                        >
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

export default function DatasetDetailPage() {
  const params = useParams<{ id: string }>()
  return (
    <Protected
      permissions={["datasets:read"]}
      fallback={
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold">Akses ditolak</h3>
          <p className="text-on-surface-variant">Minta admin memberikan permission Datasets.</p>
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <DatasetDetailContent id={params.id} />
      </Suspense>
    </Protected>
  )
}
