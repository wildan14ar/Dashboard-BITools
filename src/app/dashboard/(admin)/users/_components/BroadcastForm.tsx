"use client"

import { AlertCircle, CheckCircle2, Loader2, Megaphone } from "lucide-react"
import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { useBroadcast } from "@/hooks/use-notifications"

interface BroadcastFormProps {
  open: boolean
  onClose: () => void
  /** Preset dari halaman calendar: link + event terkait (terkunci). */
  preset?: { link?: string; calendarId?: string; eventTitle?: string }
}

export function BroadcastForm({ open, onClose, preset }: BroadcastFormProps) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [link, setLink] = useState(preset?.link ?? "")
  const [target, setTarget] = useState<"all" | "specific">("all")
  const [usernamesInput, setUsernamesInput] = useState("")
  const [result, setResult] = useState<{ sent: number; skipped: number } | null>(null)

  const broadcast = useBroadcast()

  const reset = () => {
    setTitle("")
    setBody("")
    setLink(preset?.link ?? "")
    setTarget("all")
    setUsernamesInput("")
    setResult(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    const usernames =
      target === "specific"
        ? usernamesInput
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined
    const res = await broadcast.mutateAsync({
      title: title.trim(),
      body: body.trim() || undefined,
      link: link.trim() || undefined,
      usernames,
      calendarId: preset?.calendarId,
    })
    setResult(res)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Broadcast Notifikasi
          </DialogTitle>
          <DialogDescription>
            Kirim notifikasi ke semua user aktif atau user tertentu.
            {preset?.eventTitle && (
              <span className="block mt-1 font-medium text-foreground">
                Terkait event: {preset.eventTitle}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="broadcast-title">Judul *</Label>
            <Input
              id="broadcast-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth: Maintenance terjadwal malam ini"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-body">Isi pesan</Label>
            <Textarea
              id="broadcast-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detail pengumuman (opsional)"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-link">Link</Label>
            <Input
              id="broadcast-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/dashboard atau https://... (opsional)"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Target</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as "all" | "specific")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua user aktif</SelectItem>
                <SelectItem value="specific">User tertentu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {target === "specific" && (
            <div className="space-y-2">
              <Label htmlFor="broadcast-usernames">Username (satu per baris)</Label>
              <Textarea
                id="broadcast-usernames"
                value={usernamesInput}
                onChange={(e) => setUsernamesInput(e.target.value)}
                placeholder={"admin\nuser"}
                rows={4}
              />
            </div>
          )}

          {broadcast.isError && (
            <div className="flex items-center gap-2 text-sm text-error">
              <AlertCircle className="h-4 w-4" />
              {broadcast.error?.message ?? "Gagal mengirim broadcast"}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Terkirim ke {result.sent} user
              {result.skipped > 0 ? ` (${result.skipped} dilewati)` : ""}.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {result ? "Tutup" : "Batal"}
            </Button>
            <Button type="submit" disabled={!title.trim() || broadcast.isPending}>
              {broadcast.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kirim Broadcast
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
