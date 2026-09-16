"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronRight, Info, Save, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Permission, Role } from "@/hooks/use-roles"
import { cn } from "@/lib/utils"
import { type RoleInput, RoleSchema } from "@/validations"

interface RoleFormProps {
  onSubmit: (data: { name: string; description?: string; permissions?: string[] }) => Promise<void>
  editingRole?: Role | null
  permissions: Record<string, Permission[]>
  permissionsLoading: boolean
  isSubmitting: boolean
  onCancel?: () => void
}

export function RoleForm({
  onSubmit,
  editingRole,
  permissions,
  permissionsLoading,
}: RoleFormProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    editingRole?.permissions || [],
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(RoleSchema),
    defaultValues: {
      name: editingRole?.name || "",
      description: editingRole?.description || "",
      permissions: editingRole?.permissions || [],
    },
  })

  // Sync form state when editingRole changes (render-phase)
  const [prevEditingId, setPrevEditingId] = useState(editingRole?.id)

  if (editingRole?.id !== prevEditingId) {
    setPrevEditingId(editingRole?.id)
    reset({
      name: editingRole?.name || "",
      description: editingRole?.description || "",
      permissions: editingRole?.permissions || [],
    })
    setSelectedPermissions(editingRole?.permissions || [])
  }

  const togglePermission = (action: string) => {
    setSelectedPermissions((prev) => {
      const updated = prev.includes(action) ? prev.filter((p) => p !== action) : [...prev, action]
      return updated
    })
  }

  const toggleGroup = (groupPermissions: Permission[]) => {
    const groupActions = groupPermissions.map((p) => p.action)
    const allSelected = groupActions.every((a) => selectedPermissions.includes(a))

    setSelectedPermissions((prev) => {
      if (allSelected) {
        return prev.filter((p) => !groupActions.includes(p))
      } else {
        return [...new Set([...prev, ...groupActions])]
      }
    })
  }

  const onFormSubmit = async (data: RoleInput) => {
    await onSubmit({
      name: data.name,
      description: data.description || undefined,
      permissions: selectedPermissions,
    })
  }

  return (
    <form
      id="role-form"
      onSubmit={handleSubmit(onFormSubmit)}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">
              Role Name *
            </Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                {...register("name")}
                className="pl-9"
                placeholder="e.g. Content Editor"
              />
            </div>
            {errors.name && (
              <p className="text-xs font-medium text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Description
            </Label>
            <div className="relative">
              <Info className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="description"
                {...register("description")}
                rows={1}
                className="pl-9 resize-none min-h-[38px]"
                placeholder="Briefly describe the purpose of this role..."
              />
            </div>
            {errors.description && (
              <p className="text-xs font-medium text-destructive">{errors.description.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">Permissions Configuration</h3>
          </div>

          {permissionsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading permissions registry...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {Object.entries(permissions).map(([group, perms]) => (
                <div
                  key={group}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-primary" />
                      <h4 className="font-bold text-foreground uppercase tracking-wider text-xs">
                        {group}
                      </h4>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => toggleGroup(perms)}
                      className="text-primary hover:text-primary hover:bg-primary/10 font-semibold"
                    >
                      Toggle Group
                    </Button>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {perms.map((perm: Permission) => {
                      const isSelected = selectedPermissions.includes(perm.action)
                      return (
                        <div
                          key={perm.id}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              togglePermission(perm.action)
                            }
                          }}
                          onClick={() => togglePermission(perm.action)}
                          className={cn(
                            "group relative flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary/5 border-primary/30 ring-1 ring-primary/30"
                              : "bg-transparent border-border hover:border-primary/50 hover:bg-accent/50",
                          )}
                        >
                          <div
                            className={cn(
                              "mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground group-hover:border-primary",
                            )}
                          >
                            {isSelected && <Save className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="space-y-0.5">
                            <span
                              className={cn(
                                "block text-sm font-semibold",
                                isSelected ? "text-primary" : "text-foreground",
                              )}
                            >
                              {perm.label}
                            </span>
                            <span className="block text-xs text-muted-foreground line-clamp-1 group-hover:line-clamp-none transition-all">
                              {perm.description}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
