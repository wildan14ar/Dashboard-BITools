"use client"

import { Trash2, Upload, User } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { GenderSelect } from "@/components/shared/GenderSelect"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadAttachment } from "@/hooks/use-attachments"
import { useAuth, useUpdateProfile } from "@/hooks/use-auth"
import { exceedsSize, MAX_AVATAR_SIZE, toDataUrlSize } from "@/lib/image-upload"

export function ProfileForm() {
  const { user } = useAuth()
  const updateProfile = useUpdateProfile()

  const [fullname, setFullname] = useState(user?.fullname || "")
  const [username, setUsername] = useState(user?.username || "")
  const [quote, setQuote] = useState(user?.quote || "")
  const [photo, setPhoto] = useState(user?.avatar || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [address, setAddress] = useState(user?.address || "")
  const [birthDate, setBirthDate] = useState(user?.birthDate ? user.birthDate.slice(0, 10) : "")
  const [birthPlace, setBirthPlace] = useState(user?.birthPlace || "")
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "none">(user?.gender ?? "none")
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Sinkron saat data user tiba/berganti (komponen inline selalu mounted).
  const [syncedKey, setSyncedKey] = useState<string | null>(null)
  const userKey = user ? `${user.username}-${user.email}` : null
  if (user && userKey !== syncedKey) {
    setSyncedKey(userKey)
    setFullname(user.fullname || "")
    setUsername(user.username || "")
    setQuote(user.quote || "")
    setPhoto(user.avatar || "")
    setPhone(user.phone || "")
    setAddress(user.address || "")
    setBirthDate(user.birthDate ? user.birthDate.slice(0, 10) : "")
    setBirthPlace(user.birthPlace || "")
    setGender(user.gender ?? "none")
  }

  // Upload-first: file dikirim ke POST /api/attachments, yang disimpan
  // di state hanyalah proxy URL (/api/attachments/<id>).
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Hanya file gambar yang diperbolehkan")
      return
    }

    if (exceedsSize(file, MAX_AVATAR_SIZE)) {
      setError(`Ukuran foto maksimal ${toDataUrlSize(MAX_AVATAR_SIZE)}`)
      return
    }

    setError("")
    setUploading(true)
    try {
      const attachment = await uploadAttachment(file)
      setPhoto(attachment.fileUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah foto")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaved(false)

    const payload: Record<string, unknown> = {}
    if (fullname !== (user?.fullname || "")) payload.fullname = fullname
    if (username !== (user?.username || "")) payload.username = username
    if ((quote || null) !== (user?.quote ?? null)) payload.quote = quote || null
    if ((photo || null) !== (user?.avatar ?? null)) payload.avatar = photo || null
    if ((phone || null) !== (user?.phone ?? null)) payload.phone = phone || null
    if ((address || null) !== (user?.address ?? null)) payload.address = address || null
    const birthIso = birthDate || null
    const birthOrig = user?.birthDate ? user.birthDate.slice(0, 10) : null
    if (birthIso !== birthOrig) payload.birthDate = birthIso
    if ((birthPlace || null) !== (user?.birthPlace ?? null)) payload.birthPlace = birthPlace || null
    if ((gender === "none" ? null : gender) !== (user?.gender ?? null))
      payload.gender = gender === "none" ? null : gender

    if (Object.keys(payload).length === 0) return

    try {
      await updateProfile.mutateAsync(payload)
      setSaved(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui profil"
      setError(msg)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Profil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              {error}
            </div>
          )}
          {saved && (
            <div className="p-3 text-sm text-green-700 dark:text-green-400 bg-green-500/10 rounded-lg border border-green-500/20">
              Profil berhasil disimpan.
            </div>
          )}

          {/* Photo Upload */}
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <label className="relative w-28 h-28 rounded-full border-2 border-dashed border-border hover:border-primary/50 cursor-pointer group shrink-0">
                {photo ? (
                  <>
                    <Image
                      fill
                      src={photo}
                      alt="Preview"
                      className="rounded-full object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full rounded-full bg-muted flex flex-col items-center justify-center gap-1">
                    <User className="h-8 w-8 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileUpload}
                />
              </label>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Foto profil</p>
                <p className="text-xs text-muted-foreground">JPG, PNG atau WebP. Maks 2MB.</p>
                {photo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => setPhoto("")}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Hapus foto
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pf-fullname">Nama Lengkap</Label>
              <Input
                id="pf-fullname"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="Nama lengkap"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-username">Username</Label>
              <Input
                id="pf-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/g, ""))}
                placeholder="username"
                className="font-mono text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pf-quote">Bio / Kutipan</Label>
            <Textarea
              id="pf-quote"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Tulis sedikit tentang dirimu..."
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">{quote.length}/200</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pf-phone">No. HP</Label>
              <Input
                id="pf-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="cth: 08123456789"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <GenderSelect id="pf-gender" value={gender} onChange={(v) => setGender(v)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-birthplace">Tempat Lahir</Label>
              <Input
                id="pf-birthplace"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder="cth: Jakarta"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-birthdate">Tanggal Lahir</Label>
              <Input
                id="pf-birthdate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pf-address">Alamat</Label>
            <Textarea
              id="pf-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat lengkap..."
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending || uploading}>
              {uploading
                ? "Mengunggah foto..."
                : updateProfile.isPending
                  ? "Menyimpan..."
                  : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
