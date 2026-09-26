import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

// Types
export interface Role {
  id: string
  name: string
  description: string | null
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export interface Permission {
  id: string
  action: string
  label: string
  description: string | null
}

export interface RolesResponse {
  items: Role[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_more: boolean
  }
}

export interface PermissionsResponse {
  [key: string]: Permission[]
}

export interface CreateRoleInput {
  name: string
  description?: string
  permissions?: string[]
}

export interface UpdateRoleInput {
  id: string
  name?: string
  description?: string
  permissions?: string[]
}

// Query Keys
export const rolesKeys = {
  all: ["roles"] as const,
  lists: () => [...rolesKeys.all, "list"] as const,
  list: (params: { page: number; limit: number }) => [...rolesKeys.lists(), params] as const,
  permissions: () => [...rolesKeys.all, "permissions"] as const,
}

// Hooks
export function useRoles(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: rolesKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<RolesResponse>("/users/roles", { params })
      return data
    },
  })
}

export function useRolePermissions() {
  return useQuery({
    queryKey: rolesKeys.permissions(),
    queryFn: async () => {
      const { data } = await api.get<PermissionsResponse>("/users/roles/permissions")
      return data
    },
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (roleData: CreateRoleInput) => {
      const { data } = await api.post("/users/roles", roleData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...roleData }: UpdateRoleInput & { id: string }) => {
      const { data } = await api.put(`/users/roles/${id}`, roleData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/users/roles/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() })
    },
  })
}
