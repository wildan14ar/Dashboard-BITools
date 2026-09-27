"use client"

import { Globe, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { Suspense, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import {
  type BiDashboard,
  useCreateDashboard,
  useDashboards,
  useDeleteDashboard,
  useUpdateDashboard,
} from "@/hooks/use-dashboards"

interface DashboardFormInput {
  name: string
  description?: string
  tags?: string[]
  isPublic?: boolean
}

function DashboardForm({
  initial,
  pending,
  error,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<DashboardFormInput>
  pending: boolean
  error: string | null
  submitLabel: string
  onSubmit: (input: DashboardFormInput) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "))
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          isPublic,
        })
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="db-name">Nama *</Label>
        <Input
          id="db-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Sales Overview"
          maxLength={100}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="db-desc">Deskripsi</Label>
        <Input
          id="db-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={255}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="db-tags">Tags (pisahkan koma)</Label>
        <Input
          id="db-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="sales, 2026"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="db-public" checked={isPublic} onCheckedChange={setIsPublic} />
        <Label htmlFor="db-public">Public</Label>
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!name.trim() || pending}>
          {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function DashboardsContent() {
  const { data, isLoading } = useDashboards()
  const dashboards = data ?? []
  const createDashboard = useCreateDashboard()
  const updateDashboard = useUpdateDashboard()
  const deleteDashboard = useDeleteDashboard()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<BiDashboard | null>(null)
  const [target, setTarget] = useState<BiDashboard | null>(null)

  return (
    <div className="space-y-6 p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Dashboards</h1>
          <p className="text-on-surface-variant mt-1">Kumpulan panel visual dari dataset</p>
        </div>
        <Protected permissions={["dashboards:create"]}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Dashboard
          </Button>
        </Protected>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : dashboards.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground py-8">Belum ada dashboard.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d) => (
            <Card key={d.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboards/${d.id}`}
                    className="font-semibold hover:text-primary hover:underline truncate"
                  >
                    {d.name}
                  </Link>
                  {d.isPublic && <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <span className="ml-auto flex gap-1 shrink-0">
                    <Protected permissions={["dashboards:update"]}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(d)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Protected>
                    <Protected permissions={["dashboards:delete"]}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error hover:text-error"
                        disabled={deleteDashboard.isPending}
                        onClick={() => setTarget(d)}
                        aria-label="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Protected>
                  </span>
                </div>
                {d.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{d._count?.panels ?? 0} panel</span>
                  {(d.tags ?? []).slice(0, 3).map((t) => (
                    <span key={t} className="rounded bg-muted px-1.5 py-0.5 font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(v) => !v && setCreateOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Dashboard</DialogTitle>
            <DialogDescription>Buat dashboard baru</DialogDescription>
          </DialogHeader>
          <DashboardForm
            pending={createDashboard.isPending}
            error={createDashboard.isError ? (createDashboard.error?.message ?? "Gagal") : null}
            submitLabel="Create"
            onSubmit={(input) => {
              createDashboard.mutate(input, { onSuccess: () => setCreateOpen(false) })
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Dashboard</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <DashboardForm
              key={editing.id}
              initial={{
                name: editing.name,
                description: editing.description ?? "",
                tags: editing.tags ?? [],
                isPublic: editing.isPublic,
              }}
              pending={updateDashboard.isPending}
              error={updateDashboard.isError ? (updateDashboard.error?.message ?? "Gagal") : null}
              submitLabel="Simpan"
              onSubmit={(input) => {
                updateDashboard.mutate(
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
        title="Hapus dashboard ini?"
        description={
          target ? `"${target.name}" beserta panel & filternya akan dihapus.` : undefined
        }
        confirmLabel="Hapus"
        loading={deleteDashboard.isPending}
        onConfirm={() => {
          if (!target) return
          deleteDashboard.mutate(target.id, { onSuccess: () => setTarget(null) })
        }}
      />
    </div>
  )
}

export default function DashboardsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <DashboardsContent />
    </Suspense>
  )
}
