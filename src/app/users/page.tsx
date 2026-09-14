"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type User, useCreateUser, useDeleteUser, useUpdateUser, useUsers } from "@/hooks/use-users"
import {
  type CreateBiUserInput,
  createUserSchema,
  type UpdateBiUserInput,
  updateUserSchema,
} from "@/validations/user"

export default function UsersPage() {
  const { data, isLoading } = useUsers()
  const users = data?.items ?? []
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const [editing, setEditing] = useState<User | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const createForm = useForm<CreateBiUserInput>({ resolver: zodResolver(createUserSchema) })
  const editForm = useForm<UpdateBiUserInput>({ resolver: zodResolver(updateUserSchema) })

  function onDelete(id: string) {
    if (!confirm("Delete user?")) return
    deleteUser.mutate(id)
  }

  function startEdit(user: User) {
    setEditing(user)
    editForm.reset({ fullname: "", email: user.email })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowCreate(!showCreate)}>
            New User
          </Button>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={createForm.handleSubmit((formData) =>
            createUser.mutate(formData, {
              onSuccess: () => {
                setShowCreate(false)
                createForm.reset()
              },
            }),
          )}
          className="mb-6 space-y-3 rounded-lg border p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input {...createForm.register("username")} placeholder="Username" />
            <Input {...createForm.register("fullname")} placeholder="Full Name" />
            <Input {...createForm.register("email")} placeholder="Email" />
            <Input {...createForm.register("password")} type="password" placeholder="Password" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={createUser.isPending}>
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {editing && (
        <form
          onSubmit={editForm.handleSubmit((formData) =>
            updateUser.mutate(
              { id: editing.id, ...formData },
              {
                onSuccess: () => {
                  setEditing(null)
                  editForm.reset()
                },
              },
            ),
          )}
          className="mb-6 space-y-3 rounded-lg border p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input {...editForm.register("fullname")} placeholder="Full Name" />
            <Input {...editForm.register("email")} placeholder="Email" />
            <Input
              {...editForm.register("password")}
              type="password"
              placeholder="New password (optional)"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...editForm.register("isSuperAdmin")} />
              Super Admin
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={updateUser.isPending}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Username</th>
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <th className="px-4 py-2 text-left font-medium">Super Admin</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{u.username}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.isSuperAdmin ? "Yes" : "No"}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="xs" onClick={() => startEdit(u)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => onDelete(u.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
