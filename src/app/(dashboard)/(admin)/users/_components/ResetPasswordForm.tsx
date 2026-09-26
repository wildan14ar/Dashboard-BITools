"use client"

import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react"
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
import { type User, useAdminResetPassword } from "@/hooks/use-users"

interface ResetPasswordFormProps {
  open: boolean
  onClose: () => void
  user: Pick<User, "id" | "username" | "fullname"> | null
}

export function ResetPasswordForm({ open, onClose, user }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [done, setDone] = useState(false)

  const resetPassword = useAdminResetPassword()
  const mismatch = confirm.length > 0 && newPassword !== confirm
  const tooShort = newPassword.length > 0 && newPassword.length < 6
  const canSubmit =
    !!user && newPassword.length >= 6 && newPassword === confirm && !resetPassword.isPending

  const handleClose = () => {
    setNewPassword("")
    setConfirm("")
    setDone(false)
    resetPassword.reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !user) return
    await resetPassword.mutateAsync({ id: user.id, newPassword })
    setDone(true)
    setNewPassword("")
    setConfirm("")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Setel ulang password untuk{" "}
            <span className="font-medium text-foreground">
              {user?.fullname || user?.username} (@{user?.username})
            </span>
            . Sampaikan password baru ke user melalui kanal aman.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Password berhasil direset.
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Tutup</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">Password baru *</Label>
              <Input
                id="reset-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                required
              />
              {tooShort && (
                <p className="text-xs font-medium text-destructive">Minimal 6 karakter.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Konfirmasi password *</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                required
              />
              {mismatch && (
                <p className="text-xs font-medium text-destructive">Konfirmasi tidak cocok.</p>
              )}
            </div>

            {resetPassword.isError && (
              <div className="flex items-center gap-2 text-sm text-error">
                <AlertCircle className="h-4 w-4" />
                {resetPassword.error?.message ?? "Gagal mereset password"}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Batal
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {resetPassword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
