import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

// Types — pola PortoNext
export interface User {
  id: string
  email: string
  fullname: string | null
  username: string
  isActive: boolean
  isPublic: boolean
  isSuperAdmin: boolean
  quote: string | null
  avatar: string | null
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
      const { id, ...payload } = userData
      const { data } = await api.put(`/users/${id}`, payload)
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
