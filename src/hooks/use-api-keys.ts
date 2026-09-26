import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ulid } from "ulid"
import api from "@/lib/api"

export interface ApiKey {
  id: string
  name: string
  prefix: string
  isActive: boolean
  isMCP: boolean
  isRestfull: boolean
  expiresAt: string | null
  lastUsedAt: string | null
  usageCount: number
  createdAt: string
}

export interface CreatedApiKey extends ApiKey {
  /** Full key — hanya ada di respons create, simpan segera. */
  key: string
}

export interface CreateApiKeyInput {
  name: string
  expiresAt?: string
  isMCP?: boolean
  isRestfull?: boolean
}

export interface ApiKeysResponse {
  items: ApiKey[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_more: boolean
  }
}

export const apiKeyKeys = {
  all: ["api-keys"] as const,
  list: () => [...apiKeyKeys.all, "list"] as const,
}

export function useApiKeys() {
  return useQuery({
    queryKey: apiKeyKeys.list(),
    queryFn: async () => {
      // Limit tinggi: halaman memakai filter client-side di atas hasil ini.
      const { data } = await api.get<ApiKeysResponse>("/api-keys", {
        params: { limit: 100 },
      })
      return data
    },
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateApiKeyInput) => {
      const { data } = await api.post<CreatedApiKey>("/api-keys", input, {
        idempotencyKey: ulid(),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all })
    },
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api-keys/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all })
    },
  })
}

export interface UpdateApiKeyInput {
  name?: string
  isActive?: boolean
  expiresAt?: string | null
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateApiKeyInput & { id: string }) => {
      const { data } = await api.put(`/api-keys/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all })
    },
  })
}
