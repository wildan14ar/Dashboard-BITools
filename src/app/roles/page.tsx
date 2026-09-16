"use client"

import { AlertCircle, Edit, Loader2, MoreVertical, Plus, Trash2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useState } from "react"
import { Protected } from "@/components/Protected"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog-radix"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

  const handleDelete = useCallback(
    async (id: string) => {
      if (confirm(`Apakah Anda yakin ingin menghapus role ini?`)) {
        await deleteRole.mutateAsync(id)
      }
    },
    [deleteRole],
  )

  const roles = data?.items || []

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Roles</h1>
          <p className="text-muted-foreground mt-1">Manage user roles and permissions</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      {/* Roles Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Error loading roles</h3>
              <p className="text-muted-foreground">{error?.message}</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Tidak ada role</h3>
              <p className="text-muted-foreground mb-4">Mulai dengan membuat role pertama Anda</p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Role
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => {
                  const perms = role.permissions || []
                  const visible = perms.slice(0, 4)
                  const rest = perms.length - visible.length
                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        <p className="font-medium">{role.name}</p>
                        {role.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-md flex-wrap items-center gap-1">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {perms.length}
                          </span>
                          {visible.map((action) => (
                            <span
                              key={action}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {action}
                            </span>
                          ))}
                          {rest > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{rest} lainnya
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatRelative(role.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
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
                            <DropdownMenuItem
                              onClick={() => handleDelete(role.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
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
    </div>
  )
}

export default function RolesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <Protected
        permissions={["roles:read"]}
        fallback={<AccessDenied description="Halaman Roles hanya untuk admin." />}
        loading={<div className="p-8 text-center">Loading...</div>}
      >
        <RolesContent />
      </Protected>
    </Suspense>
  )
}
