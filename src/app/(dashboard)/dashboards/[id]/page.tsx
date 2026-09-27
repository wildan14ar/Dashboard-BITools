"use client"

import { Filter, Loader2, Pencil, Play, Plus, Trash2, UserPlus, UserX } from "lucide-react"
import { useParams } from "next/navigation"
import { Suspense, useState } from "react"
import ResultTable from "@/components/bi/ResultTable"
import { Protected } from "@/components/Protected"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  type BiPanel,
  CHART_TYPES,
  useAddDashboardMember,
  useCreateFilter,
  useCreatePanel,
  useDashboard,
  useDeleteFilter,
  useDeletePanel,
  useRemoveDashboardMember,
  useSetDashboardPublic,
  useUpdatePanel,
} from "@/hooks/use-dashboards"
import { useDatasets, useRunDatasetBatch } from "@/hooks/use-datasets"
import type { RunData } from "@/lib/chart"

function PanelForm({
  dashboardId,
  initial,
  pending,
  error,
  submitLabel,
  onSubmit,
}: {
  dashboardId: string
  initial?: Partial<{ title: string; chartType: string; dataSetId: string }>
  pending: boolean
  error: string | null
  submitLabel: string
  onSubmit: (input: { title: string; chartType: string; dataSetId?: string }) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [chartType, setChartType] = useState(initial?.chartType ?? "table")
  const [dataSetId, setDataSetId] = useState(initial?.dataSetId ?? "")
  const { data: datasets } = useDatasets()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ title: title.trim(), chartType, dataSetId: dataSetId || undefined })
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor={`panel-title-${dashboardId}`}>Judul *</Label>
        <Input
          id={`panel-title-${dashboardId}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`panel-chart-${dashboardId}`}>Chart</Label>
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger id={`panel-chart-${dashboardId}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHART_TYPES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`panel-ds-${dashboardId}`}>Dataset</Label>
          <Select value={dataSetId} onValueChange={setDataSetId}>
            <SelectTrigger id={`panel-ds-${dashboardId}`} className="w-full">
              <SelectValue placeholder="Pilih dataset" />
            </SelectTrigger>
            <SelectContent>
              {(datasets ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!title.trim() || pending}>
          {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function DashboardDetailContent({ id }: { id: string }) {
  const { data: dashboard, isLoading } = useDashboard(id)
  const createPanel = useCreatePanel()
  const updatePanel = useUpdatePanel()
  const deletePanel = useDeletePanel()
  const createFilter = useCreateFilter()
  const deleteFilter = useDeleteFilter()
  const setPublic = useSetDashboardPublic()
  const addMember = useAddDashboardMember()
  const removeMember = useRemoveDashboardMember()
  const runBatch = useRunDatasetBatch()

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingPanel, setEditingPanel] = useState<BiPanel | null>(null)
  const [panelTarget, setPanelTarget] = useState<BiPanel | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterName, setFilterName] = useState("")
  const [filterLabel, setFilterLabel] = useState("")
  const [filterType, setFilterType] = useState("text")
  const [memberUserId, setMemberUserId] = useState("")
  const [panelData, setPanelData] = useState<Record<string, RunData>>({})
  const [panelErrors, setPanelErrors] = useState<Record<string, string>>({})

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <p className="p-10 text-center text-sm text-muted-foreground">Dashboard tidak ditemukan.</p>
    )
  }

  const panels = dashboard.panels ?? []
  const filters = dashboard.filters ?? []
  const members = dashboard.members ?? []

  const handleRunAll = async () => {
    const items = panels
      .filter((p) => p.dataSetId)
      .map((p) => ({ datasetId: p.dataSetId as string }))
    if (items.length === 0) return
    setPanelErrors({})
    try {
      const results = await runBatch.mutateAsync({ items })
      const next: Record<string, RunData> = {}
      const errs: Record<string, string> = {}
      for (const r of results) {
        const owner = panels.find((p) => p.dataSetId === r.datasetId)
        if (!owner) continue
        if (r.error) errs[owner.id] = r.error
        else if (r.data) next[owner.id] = r.data
      }
      setPanelData(next)
      setPanelErrors(errs)
    } catch {
      // toast error sudah ditangani api client
    }
  }

  const handleAddFilter = () => {
    if (!filterName.trim() || !filterLabel.trim()) return
    createFilter.mutate(
      { dashboardId: id, name: filterName.trim(), label: filterLabel.trim(), type: filterType },
      {
        onSuccess: () => {
          setFilterOpen(false)
          setFilterName("")
          setFilterLabel("")
          setFilterType("text")
        },
      },
    )
  }

  return (
    <div className="space-y-6 p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-on-surface-variant mt-1">{dashboard.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Protected permissions={["dashboards:update"]}>
            <Button variant="outline" onClick={() => setFilterOpen(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button onClick={() => setPanelOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Panel
            </Button>
          </Protected>
          <Button
            onClick={handleRunAll}
            disabled={runBatch.isPending || panels.filter((p) => p.dataSetId).length === 0}
          >
            {runBatch.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run all
          </Button>
        </div>
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs"
            >
              {f.label} <span className="text-muted-foreground font-mono">({f.type})</span>
              <Protected permissions={["dashboards:update"]}>
                <button
                  type="button"
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  disabled={deleteFilter.isPending}
                  onClick={() => deleteFilter.mutate({ dashboardId: id, filterId: f.id })}
                  aria-label={`Hapus filter ${f.label}`}
                >
                  ×
                </button>
              </Protected>
            </span>
          ))}
        </div>
      )}

      {panels.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground py-8">
              Belum ada panel. Tambah panel lalu hubungkan ke dataset.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {panels.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  {p.title}{" "}
                  <span className="text-xs font-normal text-muted-foreground font-mono">
                    {p.chartType}
                  </span>
                </CardTitle>
                <Protected permissions={["dashboards:update"]}>
                  <span className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPanel(p)}
                      aria-label="Edit panel"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-error hover:text-error"
                      disabled={deletePanel.isPending}
                      onClick={() => setPanelTarget(p)}
                      aria-label="Hapus panel"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </span>
                </Protected>
              </CardHeader>
              <CardContent>
                {!p.dataSetId ? (
                  <p className="text-xs text-muted-foreground">Panel belum terhubung ke dataset.</p>
                ) : panelErrors[p.id] ? (
                  <p className="text-xs font-medium text-destructive">{panelErrors[p.id]}</p>
                ) : panelData[p.id] ? (
                  <ResultTable data={panelData[p.id]} />
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada data. Klik “Run all”.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Protected permissions={["dashboards:admin"]}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sharing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                id="db-ispublic"
                checked={dashboard.isPublic}
                disabled={setPublic.isPending}
                onCheckedChange={(v) => setPublic.mutate({ dashboardId: id, isPublic: v })}
              />
              <Label htmlFor="db-ispublic">Public dashboard</Label>
            </div>
            <div className="flex gap-2">
              <Input
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                placeholder="User ID untuk ditambah sebagai member"
                className="max-w-sm"
              />
              <Button
                variant="outline"
                disabled={!memberUserId.trim() || addMember.isPending}
                onClick={() => {
                  addMember.mutate(
                    { dashboardId: id, userId: memberUserId.trim() },
                    { onSuccess: () => setMemberUserId("") },
                  )
                }}
              >
                {addMember.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Tambah
              </Button>
            </div>
            {addMember.isError && (
              <p className="text-xs font-medium text-destructive">
                {addMember.error?.message ?? "Gagal menambah member"}
              </p>
            )}
            {members.length > 0 && (
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 text-sm rounded-lg border border-border px-3 py-2"
                  >
                    <span className="font-medium">{m.user?.username ?? m.userId}</span>
                    <span className="text-xs text-muted-foreground font-mono">{m.role}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-error hover:text-error"
                      disabled={removeMember.isPending}
                      onClick={() => removeMember.mutate({ dashboardId: id, userId: m.userId })}
                      aria-label="Hapus member"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Protected>

      <Dialog open={panelOpen} onOpenChange={(v) => !v && setPanelOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Panel</DialogTitle>
            <DialogDescription>Tambah panel ke dashboard</DialogDescription>
          </DialogHeader>
          <PanelForm
            dashboardId={id}
            pending={createPanel.isPending}
            error={createPanel.isError ? (createPanel.error?.message ?? "Gagal") : null}
            submitLabel="Create"
            onSubmit={(input) => {
              createPanel.mutate(
                { ...input, dashboardId: id },
                { onSuccess: () => setPanelOpen(false) },
              )
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingPanel !== null} onOpenChange={(v) => !v && setEditingPanel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Panel</DialogTitle>
            <DialogDescription>{editingPanel?.title}</DialogDescription>
          </DialogHeader>
          {editingPanel && (
            <PanelForm
              key={editingPanel.id}
              dashboardId={id}
              initial={{
                title: editingPanel.title,
                chartType: editingPanel.chartType,
                dataSetId: editingPanel.dataSetId ?? "",
              }}
              pending={updatePanel.isPending}
              error={updatePanel.isError ? (updatePanel.error?.message ?? "Gagal") : null}
              submitLabel="Simpan"
              onSubmit={(input) => {
                updatePanel.mutate(
                  { ...input, dashboardId: id, panelId: editingPanel.id },
                  { onSuccess: () => setEditingPanel(null) },
                )
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={filterOpen} onOpenChange={(v) => !v && setFilterOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Filter</DialogTitle>
            <DialogDescription>Tambah filter dashboard</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="flt-name">Name *</Label>
              <Input
                id="flt-name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., periode"
                maxLength={100}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="flt-label">Label *</Label>
              <Input
                id="flt-label"
                value={filterLabel}
                onChange={(e) => setFilterLabel(e.target.value)}
                placeholder="e.g., Periode"
                maxLength={100}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="flt-type">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="flt-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["text", "select", "date_range", "number"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createFilter.isError && (
              <p className="text-xs font-medium text-destructive">
                {createFilter.error?.message ?? "Gagal"}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                onClick={handleAddFilter}
                disabled={!filterName.trim() || !filterLabel.trim() || createFilter.isPending}
              >
                {createFilter.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={panelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPanelTarget(null)
        }}
        title="Hapus panel ini?"
        description={panelTarget ? `"${panelTarget.title}" akan dihapus.` : undefined}
        confirmLabel="Hapus"
        loading={deletePanel.isPending}
        onConfirm={() => {
          if (!panelTarget) return
          deletePanel.mutate(
            { dashboardId: id, panelId: panelTarget.id },
            { onSuccess: () => setPanelTarget(null) },
          )
        }}
      />
    </div>
  )
}

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>()
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <DashboardDetailContent id={params.id} />
    </Suspense>
  )
}
