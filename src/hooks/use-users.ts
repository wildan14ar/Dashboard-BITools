import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { CreateBiUserInput, UpdateBiUserInput } from "@/validations/user"

export type User = {
  id: string
  username: string
  fullname: string | null
  email: string
  isSuperAdmin: boolean
  createdAt: string
}

export type UsersResponse = {
  items: User[]
  pagination: { page: number; limit: number; total: number }
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<UsersResponse>("/users")
      return res.data
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBiUserInput) => {
      const res = await api.post("/users", input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateBiUserInput & { id: string }) => {
      const res = await api.put(`/users/${id}`, input)
      return res.data
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
