"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, FlaskConical, Eye, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { SourceForm } from "@/components/source-form"
import { useSources, useCreateSource, useUpdateSource, useDeleteSource, useTestSource, type Source } from "@/hooks/use-sources"
import type { SourceInput } from "@/validation/source"

export default function SourcesPage() {
  const router = useRouter()
  const { data: sources = [], isLoading } = useSources()
  const createSource = useCreateSource()
  const updateSource = useUpdateSource()
  const deleteSource = useDeleteSource()
  const [testResult, setTestResult] = useState<Record<string, string>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [editSource, setEditSource] = useState<Source | null>(null)

  const testMutation = useTestSource()

  async function handleTest(source: Source) {
    setTestResult((p) => ({ ...p, [source.id]: "" }))
    testMutation.mutate(source.id, {
      onSuccess: (data) => setTestResult((p) => ({ ...p, [source.id]: data.ok ? "Connected" : data.error ?? "Failed" })),
      onError: () => setTestResult((p) => ({ ...p, [source.id]: "Connection failed" })),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this source?")) return
    deleteSource.mutate(id)
  }

  async function handleCreate(data: SourceInput) {
    createSource.mutate(data, { onSuccess: () => setCreateOpen(false) })
  }

  async function handleEdit(data: SourceInput) {
    if (!editSource) return
    updateSource.mutate({ id: editSource.id, ...data }, { onSuccess: () => setEditSource(null) })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Data Sources</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New Source
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
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
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : sources.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No sources yet</td></tr>
            ) : (
              sources.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2"><code className="rounded bg-muted px-1 py-0.5 text-xs">{s.type}</code></td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {testResult[s.id] && (
                        <span className={cn("mr-2 text-xs", testResult[s.id] === "Connected" ? "text-green-600" : "text-red-600")}>
                          {testResult[s.id]}
                        </span>
                      )}
                      <Button variant="ghost" size="xs" onClick={() => handleTest(s)} disabled={testMutation.isPending}>
                        <FlaskConical className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => router.push(`/sources/${s.id}`)}>
                        <Eye className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setEditSource(s)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New Source">
        <SourceForm key="create" onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create Source" />
      </Dialog>

      <Dialog open={!!editSource} onClose={() => setEditSource(null)} title="Edit Source">
        <SourceForm
          key={editSource?.id ?? "edit"}
          defaultValues={editSource ? { name: editSource.name, type: editSource.type, config: editSource.config ?? undefined } : undefined}
          onSubmit={handleEdit}
          onCancel={() => setEditSource(null)}
          submitLabel="Save Changes"
          sourceId={editSource?.id}
        />
      </Dialog>
    </div>
  )
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
