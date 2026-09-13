import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/axios"
import type { UpdateUserInput } from "@/validation/user"

export type User = {
  id: string
  userName: string
  email: string
  isSuperAdmin: boolean
  createdAt: string
}

type UserInput = {
  userName: string
  email: string
  password?: string
  isSuperAdmin?: boolean
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const data = await api.get<User[]>("/users")
      return data
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UserInput) => {
      const data = await api.post("/users", input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateUserInput & { id: string }) => {
      const data = await api.put(`/users/${id}`, input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}
