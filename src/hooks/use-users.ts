import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Gender } from "@/validations"

// Types
export interface User {
  id: string
  email: string
  fullname: string | null
  username: string
  isActive: boolean
  isSuperAdmin: boolean
  isPublic: boolean
  quote: string | null
  avatar: string | null
  phone: string | null
  address: string | null
  birthDate: string | null
  birthPlace: string | null
  gender: Gender | null
  userRoles: { role: { id: string; name: string } }[]
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

export interface UsersResponse {
  items: User[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

export interface CreateUserInput {
  email: string
  username: string
  fullname: string
  password: string
  isActive?: boolean
  isSuperAdmin?: boolean
  isPublic?: boolean
  quote?: string
  avatar?: string
  phone?: string
  address?: string
  birthDate?: string | Date
  birthPlace?: string
  gender?: Gender
  roleIds?: string[]
}

export interface UpdateUserInput {
  id: string
  username: string
  email?: string
  fullname?: string
  password?: string
  isActive?: boolean
  isSuperAdmin?: boolean
  isPublic?: boolean
  quote?: string
  avatar?: string
  phone?: string | null
  address?: string | null
  birthDate?: string | Date | null
  birthPlace?: string | null
  gender?: Gender | null
  roleIds?: string[]
}

export interface DeleteUserInput {
  id: string
}

// Query Keys
export const usersKeys = {
  all: ["users"] as const,
  lists: () => [...usersKeys.all, "list"] as const,
  list: (params: { page: number; limit: number; search?: string; isAdmin?: boolean }) =>
    [...usersKeys.lists(), params] as const,
}

// Hooks
export function useUsers(params: {
  page: number
  limit: number
  search?: string
  isAdmin?: boolean
}) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<UsersResponse>("/users", { params })
      return data
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: CreateUserInput) => {
      const { data } = await api.post("/users", userData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: UpdateUserInput) => {
      const { data } = await api.put(`/users/${userData.id}`, userData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: DeleteUserInput) => {
      const { data } = await api.delete(`/users/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() })
    },
  })
}

export function useAdminResetPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const { data } = await api.post(`/users/${id}/reset-password`, { newPassword })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() })
    },
  })
}
