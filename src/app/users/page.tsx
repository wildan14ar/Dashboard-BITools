"use client"

import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon,
  XCircle,
} from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useState } from "react"
import { Protected } from "@/components/Protected"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { Roles } from "@/components/shared/Roles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  type CreateUserInput,
  type UpdateUserInput,
  type User,
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from "@/hooks/use-users"
import { formatRelative } from "@/lib/utils"
import { UserForm } from "./_components/UserForm"

function UsersContent() {
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page")) || 1
  const limit = Number(searchParams.get("limit")) || 10

  const { data, isLoading, isError, error } = useUsers({
    page,
    limit,
    isAdmin: true,
  })
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const handleOpenCreate = useCallback(() => {
    setEditingUser(null)
    setIsFormOpen(true)
  }, [])

  const handleOpenEdit = useCallback((user: User) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false)
    setEditingUser(null)
  }, [])

  const handleSubmit = useCallback(
    async (userData: {
      email?: string
      password?: string
      fullname: string
      username: string
      isActive?: boolean
      isSuperAdmin?: boolean
      isPublic?: boolean
      quote?: string
      avatar?: string
      roleIds?: string[]
    }) => {
      try {
        if (editingUser) {
          const updatePayload: UpdateUserInput = {
            id: editingUser.id,
            username: editingUser.username,
            fullname: userData.fullname,
            email: userData.email,
            isActive: userData.isActive,
            isSuperAdmin: userData.isSuperAdmin,
            isPublic: userData.isPublic,
            quote: userData.quote,
            avatar: userData.avatar,
            roleIds: userData.roleIds,
          }
          if (userData.password) {
            updatePayload.password = userData.password
          }
          await updateUser.mutateAsync(updatePayload)
        } else {
          const createPayload: CreateUserInput = {
            email: userData.email!,
            password: userData.password!,
            fullname: userData.fullname,
            username: userData.username,
            isActive: userData.isActive,
            isSuperAdmin: userData.isSuperAdmin,
            isPublic: userData.isPublic,
            quote: userData.quote,
            avatar: userData.avatar,
            roleIds: userData.roleIds,
          }
          await createUser.mutateAsync(createPayload)
        }
        handleCloseForm()
      } catch (err) {
        console.error(err)
      }
    },
    [editingUser, createUser, updateUser, handleCloseForm],
  )

  const handleDelete = useCallback(
    async (user: User) => {
      if (confirm(`Apakah Anda yakin ingin menghapus user "${user.fullname || user.username}"?`)) {
        await deleteUser.mutateAsync({ id: user.id })
      }
    },
    [deleteUser],
  )

  const users = data?.items || []
  const totalUsers = data?.pagination.total || 0

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts and permissions</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              List User
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {totalUsers} {totalUsers === 1 ? "user" : "users"}
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
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Error loading users</h3>
              <p className="text-muted-foreground">{error?.message}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Tidak ada user</h3>
              <p className="text-muted-foreground mb-4">Mulai dengan membuat user pertama Anda</p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah User
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const roleIds = user.userRoles?.map((ur) => ur.role.id) || []
                  const roles = user.userRoles?.map((ur) => ({
                    id: ur.role.id,
                    name: ur.role.name,
                  }))
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                            {user.avatar ? (
                              <Image
                                src={user.avatar}
                                alt={user.fullname || user.username}
                                width={36}
                                height={36}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {user.fullname || user.username}
                              {user.isSuperAdmin && (
                                <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  Super Admin
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{user.username} · {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Roles roleIds={roleIds} roles={roles} />
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs">
                          {user.isActive ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {user.createdAt ? formatRelative(user.createdAt) : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(user)}
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
                  {editingUser ? "Edit User" : "Tambah User Baru"}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {editingUser
                    ? "Edit informasi user dan permissions"
                    : "Buat user baru dengan role dan permissions"}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleCloseForm}
                  disabled={createUser.isPending || updateUser.isPending}
                  size="sm"
                  className="h-8"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  form="user-form"
                  disabled={createUser.isPending || updateUser.isPending}
                  size="sm"
                  className="h-8"
                >
                  {createUser.isPending || updateUser.isPending ? (
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
          <UserForm
            key={editingUser?.id || "create"}
            editingUser={editingUser}
            onSubmit={handleSubmit}
            isSubmitting={createUser.isPending || updateUser.isPending}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <Protected
        permissions={["users:admin"]}
        fallback={<AccessDenied description="Halaman Users hanya untuk admin." />}
        loading={<div className="p-8 text-center">Loading...</div>}
      >
        <UsersContent />
      </Protected>
    </Suspense>
  )
}
