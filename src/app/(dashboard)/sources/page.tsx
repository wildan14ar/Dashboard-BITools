"use client"

import { FlaskConical, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { Suspense, useState } from "react"
import SourceConfigFields from "@/components/bi/SourceConfigFields"
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
import {
  type BiSource,
  SOURCE_TYPES,
  type SourceType,
  useCreateSource,
  useDeleteSource,
  useSources,
  useTestSource,
  useTestSourceConfig,
  useUpdateSource,
} from "@/hooks/use-sources"

type Config = Record<string, unknown>

function SourceForm({
  initialName = "",
  initialType = "postgresql" as SourceType,
  initialConfig = {},
  pending,
  error,
  submitLabel,
  onSubmit,
}: {
  initialName?: string
  initialType?: SourceType
  initialConfig?: Config
  pending: boolean
  error: string | null
  submitLabel: string
  onSubmit: (input: { name: string; type: SourceType; config: Config }) => void
}) {
  const [name, setName] = useState(initialName)
  const [type, setType] = useState<SourceType>(initialType)
  const [config, setConfig] = useState<Config>(initialConfig)
  const [testResult, setTestResult] = useState<string | null>(null)
  const testConfig = useTestSourceConfig()

  const switchType = (t: SourceType) => {
    setType(t)
    setConfig(t === "file" ? { kind: "upload" } : t === "api" ? { method: "GET", headers: {} } : {})
    setTestResult(null)
  }

  const handleTest = async () => {
    setTestResult(null)
    try {
      const res = await testConfig.mutateAsync({ name: name.trim() || "adhoc", type, config })
      setTestResult(res.ok ? "Koneksi berhasil." : `Gagal: ${res.error ?? "unknown"}`)
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Test gagal")
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name: name.trim(), type, config })
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="src-name">Nama *</Label>
        <Input
          id="src-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Postgres Produksi"
          maxLength={100}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="src-type">Tipe *</Label>
        <Select value={type} onValueChange={(v) => switchType(v as SourceType)}>
          <SelectTrigger id="src-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SourceConfigFields type={type} value={config} onChange={setConfig} />
      {testResult && (
        <p
          className={`text-xs font-medium ${testResult.startsWith("Koneksi") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
        >
          {testResult}
        </p>
      )}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={testConfig.isPending || pending}
        >
          {testConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Test koneksi
        </Button>
        <Button type="submit" disabled={!name.trim() || pending}>
          {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function SourcesContent() {
  const { data, isLoading } = useSources()
  const sources = data ?? []
  const createSource = useCreateSource()
  const deleteSource = useDeleteSource()
  const testSource = useTestSource()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<BiSource | null>(null)
  const [target, setTarget] = useState<BiSource | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testMsg, setTestMsg] = useState<Record<string, string>>({})

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const res = await testSource.mutateAsync(id)
      setTestMsg((m) => ({
        ...m,
        [id]: res.ok ? "Koneksi OK" : `Gagal: ${res.error ?? "unknown"}`,
      }))
    } catch (e) {
      setTestMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : "Test gagal" }))
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="space-y-6 p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Sources</h1>
          <p className="text-on-surface-variant mt-1">Koneksi database, API, dan file untuk BI</p>
        </div>
        <Protected permissions={["sources:create"]}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Source
          </Button>
        </Protected>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sources.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Belum ada source.</p>
          ) : (
            <div className="space-y-3">
              {sources.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/sources/${s.id}`}
                      className="text-sm font-semibold hover:text-primary hover:underline"
                    >
                      {s.name}
                    </Link>
                    <span className="text-[11px] font-medium rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 font-mono">
                      {s.type}
                    </span>
                    <span className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={testingId === s.id}
                        onClick={() => void handleTest(s.id)}
                        aria-label="Test koneksi"
                        title="Test koneksi"
                      >
                        {testingId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FlaskConical className="h-4 w-4" />
                        )}
                      </Button>
                      <Protected permissions={["sources:update"]}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(s)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Protected>
                      <Protected permissions={["sources:delete"]}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:text-error"
                          disabled={deleteSource.isPending}
                          onClick={() => setTarget(s)}
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Protected>
                    </span>
                  </div>
                  {testMsg[s.id] && (
                    <p className="mt-1 text-xs text-muted-foreground">{testMsg[s.id]}</p>
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
            <DialogTitle>New Source</DialogTitle>
            <DialogDescription>Tambah koneksi data baru</DialogDescription>
          </DialogHeader>
          <SourceForm
            pending={createSource.isPending}
            error={createSource.isError ? (createSource.error?.message ?? "Gagal") : null}
            submitLabel="Create"
            onSubmit={(input) => {
              createSource.mutate(input, { onSuccess: () => setCreateOpen(false) })
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Source</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <EditSourceForm key={editing.id} source={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title="Hapus source ini?"
        description={
          target
            ? `"${target.name}" akan dihapus. Dataset yang memakai source ini dilepas.`
            : undefined
        }
        confirmLabel="Hapus"
        loading={deleteSource.isPending}
        onConfirm={() => {
          if (!target) return
          deleteSource.mutate(target.id, { onSuccess: () => setTarget(null) })
        }}
      />
    </div>
  )
}

function EditSourceForm({ source, onDone }: { source: BiSource; onDone: () => void }) {
  const updateSource = useUpdateSource()
  return (
    <SourceForm
      initialName={source.name}
      initialType={(source.type as SourceType) ?? "postgresql"}
      initialConfig={(source.config as Config) ?? {}}
      pending={updateSource.isPending}
      error={updateSource.isError ? (updateSource.error?.message ?? "Gagal") : null}
      submitLabel="Simpan"
      onSubmit={(input) => {
        updateSource.mutate({ ...input, id: source.id }, { onSuccess: onDone })
      }}
    />
  )
}

export default function SourcesPage() {
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
        <SourcesContent />
      </Suspense>
    </Protected>
  )
}
