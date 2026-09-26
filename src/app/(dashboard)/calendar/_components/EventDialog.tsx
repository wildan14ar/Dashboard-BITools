"use client"

import { Loader2, Megaphone, Plus, Trash2, X } from "lucide-react"
import { useDeferredValue, useEffect, useState } from "react"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
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
import { useAuth } from "@/hooks/use-auth"
import type { CalendarEvent } from "@/hooks/use-calendars"
import { type User, useUsers } from "@/hooks/use-users"

export interface EventForm {
  title: string
  start: string
  end: string
  color: string
  description: string
  repeatType: string
  isHoliday: boolean
  isNotify: boolean
  userIds: string[]
}

/** ISO → nilai input datetime-local (waktu lokal). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Tanggal (tengah malam) → preset jam 09:00 hari itu. */
export function dayPreset(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`
}

const REPEAT_OPTIONS = [
  { value: "none", id: "Sekali", en: "Once" },
  { value: "daily", id: "Harian", en: "Daily" },
  { value: "weekly", id: "Mingguan", en: "Weekly" },
  { value: "monthly", id: "Bulanan", en: "Monthly" },
] as const

function AssigneePicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [known, setKnown] = useState<Map<string, User>>(new Map())
  const { can } = useAuth()

  const { data, isLoading } = useUsers({
    page: 1,
    limit: 8,
    search: deferredQuery || undefined,
    // Admin melihat semua user; user biasa hanya yang publik.
    isAdmin: can(["users:admin"]) || undefined,
  })

  useEffect(() => {
    if (!data?.items) return
    setKnown((prev) => {
      const next = new Map(prev)
      for (const u of data.items) next.set(u.id, u)
      return next
    })
  }, [data])

  const selectedSet = new Set(selected)
  const candidates = (data?.items ?? []).filter((u) => !selectedSet.has(u.id))

  const label = (id: string) => {
    const u = known.get(id)
    return u ? `${u.fullname || u.username} (@${u.username})` : `User …${id.slice(-4)}`
  }

  return (
    <div className="space-y-2">
      <Label>Assignee</Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 text-xs bg-accent rounded-full pl-2.5 pr-1 py-1"
            >
              {label(id)}
              <button
                type="button"
                aria-label="Hapus assignee"
                onClick={() => onChange(selected.filter((s) => s !== id))}
                className="p-0.5 rounded-full hover:bg-background"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari user untuk ditambahkan..."
        />
        {query.trim() !== "" && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-44 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 text-xs text-muted-foreground">Mencari...</div>
            ) : candidates.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">Tidak ada user cocok.</div>
            ) : (
              candidates.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onChange([...selected, u.id])
                    setQuery("")
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">
                    {u.fullname || u.username}{" "}
                    <span className="text-muted-foreground">@{u.username}</span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Assignee bisa melihat event ini. Kosongkan = hanya Anda (+admin).
      </p>
    </div>
  )
}

interface EventDialogProps {
  open: boolean
  onClose: () => void
  initial: EventForm
  editing?: CalendarEvent | null
  pending: boolean
  onSubmit: (form: EventForm) => Promise<void>
  onDelete?: () => Promise<void>
  deleting?: boolean
  onBroadcast?: (event: CalendarEvent) => void
}

export default function EventDialog({
  open,
  onClose,
  initial,
  editing,
  pending,
  onSubmit,
  onDelete,
  deleting,
  onBroadcast,
}: EventDialogProps) {
  const [form, setForm] = useState<EventForm>(initial)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const { can } = useAuth()
  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleConfirmDelete = async () => {
    if (!onDelete) return
    await onDelete()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Event" : "Event Baru"}</DialogTitle>
          <DialogDescription>
            {editing ? "Ubah detail event kalender." : "Buat event kalender baru."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            await onSubmit(form)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="event-title">Judul *</Label>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="cth: Rapat tim mingguan"
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-start">Mulai *</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={form.start}
                onChange={(e) => set("start", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">Selesai</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={form.end}
                min={form.start || undefined}
                onChange={(e) => set("end", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pengulangan</Label>
              <Select value={form.repeatType} onValueChange={(v) => set("repeatType", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPEAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-color">Warna</Label>
              <input
                id="event-color"
                type="color"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                className="h-9 w-16 cursor-pointer rounded border border-border bg-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="event-notify"
                checked={form.isNotify}
                onCheckedChange={(v) => set("isNotify", v)}
              />
              <Label htmlFor="event-notify">Kirim notifikasi</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="event-holiday"
                checked={form.isHoliday}
                onCheckedChange={(v) => set("isHoliday", v)}
              />
              <Label htmlFor="event-holiday">Hari libur</Label>
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-muted-foreground">
            Notifikasi pengingat dibuat untuk assignee; mematikannya akan menghapus pengingat yang
            ada.
          </p>

          <div className="space-y-2">
            <Label htmlFor="event-desc">Deskripsi</Label>
            <Textarea
              id="event-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Detail event (opsional)"
              rows={3}
            />
          </div>

          <AssigneePicker selected={form.userIds} onChange={(ids) => set("userIds", ids)} />

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {editing && onDelete && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-error hover:text-error"
                  disabled={pending || deleting}
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="ml-1">Hapus</span>
                </Button>
              )}
              {editing && onBroadcast && can(["notifications:broadcast"]) && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => onBroadcast(editing)}
                  title="Broadcast pengumuman terkait event ini"
                >
                  <Megaphone className="h-4 w-4" />
                  <span className="ml-1">Broadcast</span>
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={pending || !form.title.trim() || !form.start}>
                {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? "Simpan" : "Buat"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Hapus event ini?"
        description={editing ? `Event "${editing.title}" akan dihapus permanen.` : undefined}
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </Dialog>
  )
}
