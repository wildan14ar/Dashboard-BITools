"use client"

import { Eye, FlaskConical, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense, useState } from "react"
import { Protected } from "@/components/Protected"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { SourceForm } from "@/components/sources/source-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type BiSource,
  useCreateSource,
  useDeleteSource,
  useSources,
  useTestSource,
  useUpdateSource,
} from "@/hooks/use-sources"
import { cn } from "@/lib/utils"
import type { SourceInput } from "@/validations/source"

function SourcesContent() {
  const router = useRouter()
  const { data, isLoading } = useSources()
  const sources = data ?? []
  const createSource = useCreateSource()
  const updateSource = useUpdateSource()
  const deleteSource = useDeleteSource()
  const testMutation = useTestSource()

  const [testResult, setTestResult] = useState<Record<string, string>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [editSource, setEditSource] = useState<BiSource | null>(null)
  const [target, setTarget] = useState<BiSource | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  async function handleTest(source: BiSource) {
    setTestingId(source.id)
    setTestResult((p) => ({ ...p, [source.id]: "" }))
    try {
      const d = await testMutation.mutateAsync(source.id)
      setTestResult((p) => ({
        ...p,
        [source.id]: d.ok ? "Connected" : (d.error ?? "Failed"),
      }))
    } catch {
      setTestResult((p) => ({ ...p, [source.id]: "Connection failed" }))
    } finally {
      setTestingId(null)
    }
  }

  async function handleCreate(data: SourceInput) {
    await createSource.mutateAsync(data)
    setCreateOpen(false)
  }

  async function handleEdit(data: SourceInput) {
    if (!editSource) return
    await updateSource.mutateAsync({ id: editSource.id, ...data })
    setEditSource(null)
  }

  return (
    <div className="space-y-6 p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Data Sources</h1>
          <p className="text-on-surface-variant mt-1">Koneksi database, API, dan file untuk BI</p>
        </div>
        <Protected permissions={["sources:create"]}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Source
          </Button>
        </Protected>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : sources.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No sources yet
                </td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-border hover:bg-accent/30 transition-colors"
                >
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/sources/${s.id}`} className="hover:text-primary hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{s.type}</code>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {testResult[s.id] && (
                        <span
                          className={cn(
                            "mr-2 text-xs",
                            testResult[s.id] === "Connected"
                              ? "text-green-600"
                              : "text-destructive",
                          )}
                        >
                          {testResult[s.id]}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleTest(s)}
                        disabled={testingId === s.id}
                        title="Test koneksi"
                        aria-label="Test koneksi"
                      >
                        {testingId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FlaskConical className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/sources/${s.id}`)}
                        title="Database Explorer"
                        aria-label="Database Explorer"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Protected permissions={["sources:update"]}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditSource(s)}
                          title="Edit"
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
                          title="Hapus"
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Protected>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onOpenChange={(v) => !v && setCreateOpen(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Source</DialogTitle>
            <DialogDescription>Tambah koneksi data baru</DialogDescription>
          </DialogHeader>
          <SourceForm
            key="create"
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create Source"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editSource !== null} onOpenChange={(v) => !v && setEditSource(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Source</DialogTitle>
            <DialogDescription>{editSource?.name}</DialogDescription>
          </DialogHeader>
          {editSource && (
            <SourceForm
              key={editSource.id}
              defaultValues={{
                name: editSource.name,
                type: editSource.type as SourceInput["type"],
                config: (editSource.config ?? {}) as SourceInput["config"],
              }}
              onSubmit={handleEdit}
              onCancel={() => setEditSource(null)}
              submitLabel="Save Changes"
              sourceId={editSource.id}
            />
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
