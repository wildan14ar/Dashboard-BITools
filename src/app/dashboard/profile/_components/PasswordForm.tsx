"use client"

import { CheckCircle2, KeyRound, Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useResetPassword } from "@/hooks/use-auth"

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const resetPassword = useResetPassword()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.")
      return
    }

    try {
      await resetPassword.mutateAsync({ currentPassword, newPassword })
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah password"
      setError(msg)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Ganti Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Sesi di perangkat lain akan dicabut setelah password diubah.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="pw-current">Password Saat Ini</Label>
            <Input
              id="pw-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pw-new">Password Baru</Label>
              <Input
                id="pw-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">Konfirmasi Password Baru</Label>
              <Input
                id="pw-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 text-sm text-green-700 dark:text-green-400 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle2 className="h-4 w-4" />
              Password berhasil diubah.
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ubah Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
