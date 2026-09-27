"use client"

import { FlaskConical, Loader2, Play, TableProperties } from "lucide-react"
import { useParams } from "next/navigation"
import { Suspense, useState } from "react"
import ResultTable from "@/components/bi/ResultTable"
import { Protected } from "@/components/Protected"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useRunSource, useSource, useSourceSchema, useTestSource } from "@/hooks/use-sources"
import type { RunData } from "@/lib/chart"

function SourceDetailContent({ id }: { id: string }) {
  const { data: source, isLoading } = useSource(id)
  const { data: schema, isLoading: schemaLoading, refetch: refetchSchema } = useSourceSchema(id)
  const testSource = useTestSource()
  const runSource = useRunSource()

  const [sql, setSql] = useState("SELECT 1")
  const [result, setResult] = useState<RunData | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [testMsg, setTestMsg] = useState<string | null>(null)

  const handleTest = async () => {
    setTestMsg(null)
    try {
      const res = await testSource.mutateAsync(id)
      setTestMsg(res.ok ? "Koneksi berhasil." : `Gagal: ${res.error ?? "unknown"}`)
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "Test gagal")
    }
  }

  const handleRun = async () => {
    setRunError(null)
    setResult(null)
    try {
      const res = await runSource.mutateAsync({ id, sql })
      setResult(res)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Query gagal")
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!source) {
    return <p className="p-10 text-center text-sm text-muted-foreground">Source tidak ditemukan.</p>
  }

  const tables = schema?.tables ?? []

  return (
    <div className="space-y-6 p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">{source.name}</h1>
          <p className="text-on-surface-variant mt-1 font-mono text-sm">{source.type}</p>
        </div>
        <Button variant="outline" onClick={handleTest} disabled={testSource.isPending}>
          {testSource.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FlaskConical className="h-4 w-4 mr-2" />
          )}
          Test koneksi
        </Button>
      </div>

      {testMsg && <p className="text-sm text-muted-foreground">{testMsg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Schema</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void refetchSchema()}>
              <TableProperties className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {schemaLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : tables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Schema kosong atau engine belum tersedia.
              </p>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto">
                {tables.map((t, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-semibold font-mono">
                      {t.schema ? `${t.schema}.` : ""}
                      {t.name}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {(t.columns ?? []).map((c, j) => (
                        <li key={j} className="text-xs text-muted-foreground font-mono">
                          {c.name} <span className="opacity-70">· {c.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">SQL Runner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              rows={6}
              spellCheck={false}
              className="font-mono text-sm"
              placeholder="SELECT ..."
            />
            <div className="flex justify-end">
              <Button onClick={handleRun} disabled={!sql.trim() || runSource.isPending}>
                {runSource.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run
              </Button>
            </div>
            {runError && <p className="text-xs font-medium text-destructive">{runError}</p>}
            {result && <ResultTable data={result} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SourceDetailPage() {
  const params = useParams<{ id: string }>()
  return (
    <Protected
      permissions={["sources:read"]}
      fallback={
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold">Akses ditolak</h3>
          <p className="text-on-surface-variant">Minta admin memberikan permission Sources.</p>
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <SourceDetailContent id={params.id} />
      </Suspense>
    </Protected>
  )
}
