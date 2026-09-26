"use client"

import { AlertCircle, Edit, Loader2, MoreVertical, Plus, Shield, Trash2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useState } from "react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Role } from "@/hooks/use-roles"
import {
  useCreateRole,
  useDeleteRole,
  useRolePermissions,
  useRoles,
  useUpdateRole,
} from "@/hooks/use-roles"
import { formatRelative } from "@/lib/utils"
import { RoleForm } from "./_components/RoleForm"

function RolesContent() {
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page")) || 1
  const limit = Number(searchParams.get("limit")) || 10

  const { data, isLoading, isError, error } = useRoles({ page, limit })
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()
  const { data: permissionsData, isLoading: permissionsLoading } = useRolePermissions()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [targetRole, setTargetRole] = useState<Role | null>(null)

  const handleOpenCreate = useCallback(() => {
    setEditingRole(null)
    setIsFormOpen(true)
  }, [])

  const handleOpenEdit = useCallback((role: Role) => {
    setEditingRole(role)
    setIsFormOpen(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false)
    setEditingRole(null)
  }, [])

  const handleSubmit = useCallback(
    async (data: { name: string; description?: string; permissions?: string[] }) => {
      try {
        if (editingRole) {
          await updateRole.mutateAsync({ id: editingRole.id, ...data })
        } else {
          await createRole.mutateAsync(data)
        }
        handleCloseForm()
      } catch (err) {
        console.error(err)
      }
    },
    [editingRole, createRole, updateRole, handleCloseForm],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!targetRole) return
    try {
      await deleteRole.mutateAsync(targetRole.id)
      setTargetRole(null)
    } catch {
      // toast error sudah ditangani api client; dialog tetap terbuka
    }
  }, [deleteRole, targetRole])

  const roles = data?.items || []
  const totalRoles = data?.pagination.total || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Roles</h1>
          <p className="text-on-surface-variant mt-1">Manage user roles and permissions</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              List Role
            </span>
            <span className="text-sm font-normal text-on-surface-variant">
              {totalRoles} {totalRoles === 1 ? "role" : "roles"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-error mb-4" />
              <h3 className="text-lg font-semibold">Error loading roles</h3>
              <p className="text-on-surface-variant">{error?.message}</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-on-surface-variant mb-4" />
              <h3 className="text-lg font-semibold">Tidak ada role</h3>
              <p className="text-on-surface-variant mb-4">Mulai dengan membuat role pertama Anda</p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Role
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{role.name}</h3>
                    </div>
                    {role.description && (
                      <p className="text-sm text-on-surface-variant line-clamp-2 mb-2">
                        {role.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="px-2 py-1 bg-primary-container text-on-primary-container rounded">
                        {role.permissions?.length || 0} permissions
                      </span>
                      <span>Created {formatRelative(role.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(role)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTargetRole(role)} className="text-error">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent
          className="w-[70vw] max-w-none! max-h-[90vh] overflow-y-auto scroll-hidden-y"
          showCloseButton={false}
        >
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-xl">
                  {editingRole ? "Edit Role" : "Tambah Role Baru"}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {editingRole ? "Edit role dan permissions" : "Buat role baru dengan permissions"}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleCloseForm}
                  disabled={createRole.isPending || updateRole.isPending}
                  size="sm"
                  className="h-8"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  form="role-form"
                  disabled={createRole.isPending || updateRole.isPending}
                  size="sm"
                  className="h-8"
                >
                  {createRole.isPending || updateRole.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Simpan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>
          <RoleForm
            key={editingRole?.id || "create"}
            editingRole={editingRole}
            onSubmit={handleSubmit}
            permissions={permissionsData || {}}
            permissionsLoading={permissionsLoading}
            isSubmitting={createRole.isPending || updateRole.isPending}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={targetRole !== null}
        onOpenChange={(open) => {
          if (!open) setTargetRole(null)
        }}
        title="Hapus role ini?"
        description={targetRole ? `Role "${targetRole.name}" akan dihapus permanen.` : undefined}
        confirmLabel="Hapus"
        loading={deleteRole.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default function RolesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <RolesContent />
    </Suspense>
  )
}
