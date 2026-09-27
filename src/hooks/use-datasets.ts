import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ulid } from "ulid"
import api from "@/lib/api"
import type { RunData } from "@/lib/chart"

export interface BiDataset {
  id: string
  name: string
  sql: string
  description: string | null
  isPublic: boolean
  sourceId: string | null
  source?: { id?: string; name?: string } | null
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateDatasetInput {
  name: string
  sql: string
  description?: string
  sourceId: string
  isPublic?: boolean
}

export interface UpdateDatasetInput {
  name?: string
  sql?: string
  description?: string
  sourceId?: string
  isPublic?: boolean
}

export const datasetKeys = {
  all: ["datasets"] as const,
  list: () => [...datasetKeys.all, "list"] as const,
  detail: (id: string) => [...datasetKeys.all, "detail", id] as const,
}

export function useDatasets() {
  return useQuery({
    queryKey: datasetKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<BiDataset[]>("/datasets")
      return data
    },
  })
}

export function useDataset(id: string | null) {
  return useQuery({
    queryKey: datasetKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data } = await api.get<BiDataset>(`/datasets/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateDataset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateDatasetInput) => {
      const { data } = await api.post<BiDataset>("/datasets", input, {
        idempotencyKey: ulid(),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.all })
    },
  })
}

export function useUpdateDataset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateDatasetInput & { id: string }) => {
      const { data } = await api.put<BiDataset>(`/datasets/${id}`, input)
      return data
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.all })
      queryClient.invalidateQueries({ queryKey: datasetKeys.detail(vars.id) })
    },
  })
}

export function useDeleteDataset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/datasets/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.all })
    },
  })
}

export interface RunDatasetInput {
  datasetId: string
  params?: Record<string, string>
  cache?: boolean
}

/** Jalankan satu dataset tersimpan. */
export function useRunDataset() {
  return useMutation({
    mutationFn: async ({ datasetId, params = {}, cache = true }: RunDatasetInput) => {
      const { data } = await api.post<RunData>(
        `/datasets/${datasetId}/run`,
        { params, cache },
        { timeoutMs: 180_000 },
      )
      return data
    },
  })
}
