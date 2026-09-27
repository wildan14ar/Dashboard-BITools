"use client"

import { Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react"
import { Suspense, useState } from "react"
import ResultTable from "@/components/bi/ResultTable"
import { Protected } from "@/components/Protected"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  type BiDataset,
  useCreateDataset,
  useDatasets,
  useDeleteDataset,
  useRunDataset,
  useUpdateDataset,
} from "@/hooks/use-datasets"
import { useSources } from "@/hooks/use-sources"
import type { RunData } from "@/lib/chart"

interface DatasetFormInput {
  name: string
  sql: string
  description?: string
  sourceId: string
  isPublic?: boolean
}

function DatasetForm({
  initial,
  pending,
  error,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<DatasetFormInput>
  pending: boolean
  error: string | null
  submitLabel: string
  onSubmit: (input: DatasetFormInput) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [sql, setSql] = useState(initial?.sql ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [sourceId, setSourceId] = useState(initial?.sourceId ?? "")
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false)
  const { data: sources } = useSources()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          name: name.trim(),
          sql: sql.trim(),
          description: description.trim() || undefined,
          sourceId,
          isPublic,
        })
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="ds-name">Nama *</Label>
        <Input
          id="ds-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Penjualan Bulanan"
          maxLength={100}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ds-source">Source *</Label>
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger id="ds-source" className="w-full">
            <SelectValue placeholder="Pilih source" />
          </SelectTrigger>
          <SelectContent>
            {(sources ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ds-sql">SQL *</Label>
        <Textarea
          id="ds-sql"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={6}
          spellCheck={false}
          className="font-mono text-sm"
          placeholder="SELECT ..."
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ds-desc">Deskripsi</Label>
        <Input
          id="ds-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={255}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="ds-public" checked={isPublic} onCheckedChange={setIsPublic} />
        <Label htmlFor="ds-public">Public</Label>
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!name.trim() || !sql.trim() || !sourceId || pending}>
          {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function DatasetsContent() {
  const { data, isLoading } = useDatasets()
  const datasets = data ?? []
  const createDataset = useCreateDataset()
  const updateDataset = useUpdateDataset()
  const deleteDataset = useDeleteDataset()
  const runDataset = useRunDataset()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<BiDataset | null>(null)
  const [target, setTarget] = useState<BiDataset | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, RunData>>({})
  const [runErrors, setRunErrors] = useState<Record<string, string>>({})

  const handleRun = async (id: string) => {
    setRunningId(id)
    setRunErrors((m) => {
      const next = { ...m }
      delete next[id]
      return next
    })
    try {
      const res = await runDataset.mutateAsync({ datasetId: id })
      setResults((m) => ({ ...m, [id]: res }))
    } catch (e) {
      setRunErrors((m) => ({ ...m, [id]: e instanceof Error ? e.message : "Run gagal" }))
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="space-y-6 p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Datasets</h1>
          <p className="text-on-surface-variant mt-1">Query tersimpan di atas source</p>
        </div>
        <Protected permissions={["datasets:create"]}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Dataset
          </Button>
        </Protected>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : datasets.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Belum ada dataset.</p>
          ) : (
            <div className="space-y-3">
              {datasets.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{d.name}</span>
                    {d.isPublic && (
                      <span className="text-[11px] font-medium rounded bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5">
                        public
                      </span>
                    )}
                    {d.source && (
                      <span className="text-[11px] font-mono rounded bg-muted text-muted-foreground px-2 py-0.5">
                        {d.source.name}
                      </span>
                    )}
                    <span className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={runningId === d.id}
                        onClick={() => void handleRun(d.id)}
                        aria-label="Run"
                        title="Run dataset"
                      >
                        {runningId === d.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Protected permissions={["datasets:update"]}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(d)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Protected>
                      <Protected permissions={["datasets:delete"]}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:text-error"
                          disabled={deleteDataset.isPending}
                          onClick={() => setTarget(d)}
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Protected>
                    </span>
                  </div>
                  {d.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
                  )}
                  {runErrors[d.id] && (
                    <p className="mt-2 text-xs font-medium text-destructive">{runErrors[d.id]}</p>
                  )}
                  {results[d.id] && (
                    <div className="mt-3">
                      <ResultTable data={results[d.id]} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(v) => !v && setCreateOpen(false)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Dataset</DialogTitle>
            <DialogDescription>Simpan query di atas sebuah source</DialogDescription>
          </DialogHeader>
          <DatasetForm
            pending={createDataset.isPending}
            error={createDataset.isError ? (createDataset.error?.message ?? "Gagal") : null}
            submitLabel="Create"
            onSubmit={(input) => {
              createDataset.mutate(input, { onSuccess: () => setCreateOpen(false) })
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Dataset</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <DatasetForm
              key={editing.id}
              initial={{
                name: editing.name,
                sql: editing.sql,
                description: editing.description ?? "",
                sourceId: editing.sourceId ?? "",
                isPublic: editing.isPublic,
              }}
              pending={updateDataset.isPending}
              error={updateDataset.isError ? (updateDataset.error?.message ?? "Gagal") : null}
              submitLabel="Simpan"
              onSubmit={(input) => {
                updateDataset.mutate(
                  { ...input, id: editing.id },
                  { onSuccess: () => setEditing(null) },
                )
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title="Hapus dataset ini?"
        description={target ? `"${target.name}" akan dihapus permanen.` : undefined}
        confirmLabel="Hapus"
        loading={deleteDataset.isPending}
        onConfirm={() => {
          if (!target) return
          deleteDataset.mutate(target.id, { onSuccess: () => setTarget(null) })
        }}
      />
    </div>
  )
}

export default function DatasetsPage() {
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
        <DatasetsContent />
      </Suspense>
    </Protected>
  )
}
