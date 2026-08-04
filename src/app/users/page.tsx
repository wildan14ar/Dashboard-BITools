"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/validation/user"

type User = {
  id: string
  userName: string
  fullName: string | null
  email: string
  isSuperAdmin: boolean
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const createForm = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema) })
  const editForm = useForm<UpdateUserInput>({ resolver: zodResolver(updateUserSchema) })

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await axios.get<User[]>("/api/users")
    setUsers(data)
    setLoading(false)
  }

  async function onCreate(data: CreateUserInput) {
    await axios.post("/api/users", data)
    setShowCreate(false)
    createForm.reset()
    fetchUsers()
  }

  async function onUpdate(data: UpdateUserInput) {
    if (!editing) return
    await axios.put(`/api/users/${editing.id}`, data)
    setEditing(null)
    editForm.reset()
    fetchUsers()
  }

  async function onDelete(id: string) {
    if (!confirm("Delete user?")) return
    await axios.delete(`/api/users/${id}`)
    fetchUsers()
  }

  function startEdit(user: User) {
    setEditing(user)
    editForm.reset({ fullName: user.fullName ?? "", email: user.email })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowCreate(!showCreate)}>New User</Button>
          <LogoutButton />
        </div>
      </div>

      {showCreate && (
        <form onSubmit={createForm.handleSubmit(onCreate)} className="mb-6 space-y-3 rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-3">
            <input {...createForm.register("userName")} placeholder="Username" className="input" />
            <input {...createForm.register("fullName")} placeholder="Full Name" className="input" />
            <input {...createForm.register("email")} placeholder="Email" className="input" />
            <input {...createForm.register("password")} type="password" placeholder="Password" className="input" />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Create</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {editing && (
        <form onSubmit={editForm.handleSubmit(onUpdate)} className="mb-6 space-y-3 rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-3">
            <input {...editForm.register("fullName")} placeholder="Full Name" className="input" />
            <input {...editForm.register("email")} placeholder="Email" className="input" />
            <input {...editForm.register("password")} type="password" placeholder="New password (optional)" className="input" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...editForm.register("isSuperAdmin")} />
              Super Admin
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Username</th>
              <th className="px-4 py-2 text-left font-medium">Full Name</th>
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <th className="px-4 py-2 text-left font-medium">Super Admin</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{u.userName}</td>
                  <td className="px-4 py-2">{u.fullName ?? "-"}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.isSuperAdmin ? "Yes" : "No"}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="xs" onClick={() => startEdit(u)}>Edit</Button>
                    <Button variant="ghost" size="xs" onClick={() => onDelete(u.id)}>Delete</Button>
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
