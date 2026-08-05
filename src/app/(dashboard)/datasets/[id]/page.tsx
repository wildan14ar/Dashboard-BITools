"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"
import { ArrowLeft, Play, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type SourceInfo = { id: string; name: string; type: string }
type Dataset = {
  id: string; name: string; description: string | null; sql: string
  source: SourceInfo | null; lastRunAt: string | null
}

export default function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEdit = searchParams.get("edit") === "1"

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [sql, setSql] = useState("")
  const [name, setName] = useState("")
  const [result, setResult] = useState<{ columns: string[]; rows: { values: string[] }[]; rowCount: number; executionTimeMs: number } | null>(null)
  const [error, setError] = useState("")
  const [running, setRunning] = useState(false)
  const [id, setId] = useState("")

  useEffect(() => { params.then((p) => { setId(p.id); loadData(p.id) }) }, [])

  async function loadData(datasetId: string) {
    const { data } = await axios.get(`/api/datasets/${datasetId}`)
    setDataset(data)
    setSql(data.sql)
    setName(data.name)
  }

  async function handleRun() {
    setRunning(true)
    setError("")
    setResult(null)
    try {
      const { data } = await axios.post(`/api/datasets/${id}/run`)
      setResult(data)
    } catch (err) {
      setError(String(err))
    }
    setRunning(false)
  }

  async function handleSave() {
    await axios.put(`/api/datasets/${id}`, { ...dataset, name, sql, sourceId: dataset?.source?.id })
    router.refresh()
  }

  if (!dataset) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/datasets")}><ArrowLeft className="size-4" /></Button>
        {isEdit ? (
          <input value={name} onChange={(e) => setName(e.target.value)} className="input w-64" />
        ) : (
          <h1 className="text-lg font-semibold">{dataset.name}</h1>
        )}
        <span className="text-xs text-muted-foreground">
          {dataset.source ? `${dataset.source.name} (${dataset.source.type})` : "No source"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {isEdit && <Button variant="outline" onClick={handleSave}>Save</Button>}
          <Button onClick={handleRun} disabled={running}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
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
            value={sql}
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
                <span className="flex items-center gap-1"><Clock className="size-3" />{result.executionTimeMs}ms</span>
                <span>{result.rowCount} rows</span>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {error && <div className="p-4 text-sm text-destructive">{error}</div>}
            {running && <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Running query...</div>}
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
            {!error && !running && !result && (
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
