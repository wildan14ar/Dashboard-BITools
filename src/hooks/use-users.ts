import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
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
      const { data } = await axios.get<User[]>("/api/users")
      return data
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UserInput) => {
      const { data } = await axios.post("/api/users", input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateUserInput & { id: string }) => {
      const { data } = await axios.put(`/api/users/${id}`, input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/users/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}
