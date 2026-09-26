"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Image as ImageIcon, Lock, Mail, Quote, Upload, User as UserIcon, X } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { GenderSelect, type GenderValue } from "@/components/shared/GenderSelect"
import { InputRole } from "@/components/shared/Roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { uploadAttachment } from "@/hooks/use-attachments"
import type { User } from "@/hooks/use-users"
import { exceedsSize, MAX_AVATAR_SIZE, toDataUrlSize } from "@/lib/image-upload"
import type { Gender } from "@/validations"
import { type UpdateUserInput, UpdateUserSchema, type UserInput, UserSchema } from "@/validations"

interface UserFormProps {
  onSubmit: (data: {
    email?: string
    password?: string
    fullname: string
    username: string
    isActive?: boolean
    isSuperAdmin?: boolean
    isPublic?: boolean
    quote?: string | null
    avatar?: string | null
    phone?: string | null
    address?: string | null
    birthDate?: string | Date | null
    birthPlace?: string | null
    gender?: Gender | null
    roleIds?: string[]
  }) => Promise<void>
  editingUser?: User | null
  isSubmitting: boolean
  onCancel?: () => void
}

export function UserForm({ onSubmit, editingUser }: UserFormProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [photoPreview, setPhotoPreview] = useState<string | null>(editingUser?.avatar || null)
  const [photoData, setPhotoData] = useState<string | null>(editingUser?.avatar || null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditMode = !!editingUser

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserInput>({
    // Skema validasi berbeda per mode; tipe form mengikuti UserSchema (super-set).
    resolver: zodResolver(isEditMode ? UpdateUserSchema : UserSchema) as never,
    defaultValues: {
      email: "",
      username: "",
      fullname: "",
      quote: "",
      password: "",
      phone: "",
      address: "",
      birthDate: undefined,
      birthPlace: "",
      gender: undefined,
    },
  })

  // Sync form state when editingUser changes (render-phase)
  const [prevEditingId, setPrevEditingId] = useState(editingUser?.id)

  if (editingUser?.id !== prevEditingId) {
    setPrevEditingId(editingUser?.id)
    if (editingUser) {
      reset({
        email: editingUser.email,
        username: editingUser.username,
        fullname: editingUser.fullname || "",
        quote: editingUser.quote || "",
        password: "",
        phone: editingUser.phone || "",
        address: editingUser.address || "",
        birthDate: (editingUser.birthDate
          ? new Date(editingUser.birthDate).toISOString().slice(0, 10)
          : "") as never,
        birthPlace: editingUser.birthPlace || "",
        gender: editingUser.gender ?? undefined,
      })
      setIsActive(editingUser.isActive)
      setIsSuperAdmin(editingUser.isSuperAdmin)
      setIsPublic(editingUser.isPublic)
      setPhotoPreview(editingUser.avatar || null)
      setPhotoData(editingUser.avatar || null)
      const roleIds = editingUser.userRoles?.map((ur) => ur.role.id) || []
      setSelectedRoleIds(roleIds)
    } else {
      reset({
        email: "",
        username: "",
        fullname: "",
        quote: "",
        password: "",
        phone: "",
        address: "",
        birthDate: "" as never,
        birthPlace: "",
        gender: undefined,
      })
      setIsActive(true)
      setIsSuperAdmin(false)
      setIsPublic(true)
      setPhotoPreview(null)
      setPhotoData(null)
      setSelectedRoleIds([])
    }
  }

  // Upload-first: file dikirim ke POST /api/attachments, form hanya
  // menyimpan proxy URL (/api/attachments/<id>) sebagai avatar.
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Pilih file gambar")
      return
    }

    if (exceedsSize(file, MAX_AVATAR_SIZE)) {
      toast.error(`Ukuran foto maksimal ${toDataUrlSize(MAX_AVATAR_SIZE)}`)
      return
    }

    setUploadingPhoto(true)
    try {
      const attachment = await uploadAttachment(file)
      setPhotoPreview(attachment.fileUrl)
      setPhotoData(attachment.fileUrl)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto")
      if (fileInputRef.current) fileInputRef.current.value = ""
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setPhotoData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFormSubmit = async (
    data: z.infer<typeof UserSchema> | z.infer<typeof UpdateUserSchema>,
  ) => {
    // Password hanya ada saat create (UpdateUserSchema men-strip-nya saat edit).
    // Reset password lewat form terpisah → endpoint reset-password.
    const submitData = {
      ...data,
      isActive,
      isSuperAdmin,
      isPublic,
      avatar: photoData || undefined,
      roleIds: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
    }

    await onSubmit(submitData as UserInput | UpdateUserInput)
  }

  return (
    <form id="user-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="relative group">
          <div className="w-28 h-28 rounded-xl bg-muted border-2 border-dashed border-border overflow-hidden group-hover:border-primary/50 transition-all flex items-center justify-center">
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Photo preview"
                width={112}
                height={112}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageIcon className="w-8 h-8 opacity-20" />
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-40">
                  No Photo
                </span>
              </div>
            )}

            {/* Overlay on hover */}
            <button
              type="button"
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6 text-white" />
            </button>
          </div>

          {photoPreview && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="text-center">
          <h3 className="text-sm font-semibold text-foreground">User Thumbnail</h3>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP. Max 2MB.</p>
          {!photoPreview && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 mt-1 text-primary text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Image
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          disabled={uploadingPhoto}
          className="hidden"
        />
        {uploadingPhoto && <p className="text-xs text-muted-foreground">Mengunggah foto...</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullname">Full Name *</Label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="fullname"
              {...register("fullname")}
              className="pl-9"
              placeholder="John Doe"
            />
          </div>
          {errors.fullname && (
            <p className="text-xs font-medium text-destructive">{errors.fullname.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username *</Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">@</span>
            <Input id="username" {...register("username")} className="pl-8" placeholder="johndoe" />
          </div>
          {errors.username && (
            <p className="text-xs font-medium text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>{" "}
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              {...register("email")}
              className="pl-9"
              placeholder="user@example.com"
            />
          </div>
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        {!editingUser && (
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                {...register("password")}
                className="pl-9"
                placeholder="••••••"
              />
            </div>
            {errors.password && (
              <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="quote">Quote</Label>
        <div className="relative">
          <Quote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            id="quote"
            {...register("quote")}
            rows={2}
            className="pl-9 resize-none"
            placeholder="Your favorite quote or motto..."
          />
        </div>
        {errors.quote && (
          <p className="text-xs font-medium text-destructive">{errors.quote.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">No. HP</Label>
          <Input id="phone" {...register("phone")} placeholder="cth: 08123456789" />
          {errors.phone && (
            <p className="text-xs font-medium text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <GenderSelect
                value={(field.value ?? "none") as GenderValue}
                onChange={(v) => field.onChange(v === "none" ? undefined : v)}
              />
            )}
          />
          {errors.gender && (
            <p className="text-xs font-medium text-destructive">{errors.gender.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthPlace">Tempat Lahir</Label>
          <Input id="birthPlace" {...register("birthPlace")} placeholder="cth: Jakarta" />
          {errors.birthPlace && (
            <p className="text-xs font-medium text-destructive">{errors.birthPlace.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthDate">Tanggal Lahir</Label>
          <Input id="birthDate" type="date" {...register("birthDate")} />
          {errors.birthDate && (
            <p className="text-xs font-medium text-destructive">{errors.birthDate.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Textarea
          id="address"
          {...register("address")}
          rows={2}
          className="resize-none"
          placeholder="Alamat lengkap..."
        />
        {errors.address && (
          <p className="text-xs font-medium text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-3 bg-muted/30">
          <Label
            htmlFor="isActive"
            className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Active
          </Label>
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="flex items-center justify-between space-x-2 rounded-lg border p-3 bg-muted/30">
          <Label
            htmlFor="isSuperAdmin"
            className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Super Admin
          </Label>
          <Switch id="isSuperAdmin" checked={isSuperAdmin} onCheckedChange={setIsSuperAdmin} />
        </div>

        <div className="flex items-center justify-between space-x-2 rounded-lg border p-3 bg-muted/30">
          <Label
            htmlFor="isPublic"
            className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Public Profile
          </Label>
          <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
        </div>
      </div>

      <div className="space-y-2">
        <InputRole
          label="Roles"
          selected={selectedRoleIds}
          onChange={setSelectedRoleIds}
          placeholder="Select roles"
        />
      </div>
    </form>
  )
}
