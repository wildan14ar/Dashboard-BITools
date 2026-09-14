import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { DatasetInput } from "@/validations/dataset"

export type Dataset = {
  id: string
  name: string
  sql: string
  sourceId: string
  isPublic: boolean
  lastRunAt: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export function useDatasets() {
  return useQuery({
    queryKey: ["datasets"],
    queryFn: async () => {
      const res = await api.get<Dataset[]>("/datasets")
      return res.data
    },
  })
}

export function useDataset(id: string) {
  return useQuery({
    queryKey: ["datasets", id],
    queryFn: async () => {
      const res = await api.get<Dataset>(`/datasets/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DatasetInput) => {
      const res = await api.post("/datasets", input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["datasets"] }),
  })
}

export function useUpdateDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: DatasetInput & { id: string }) => {
      const res = await api.put(`/datasets/${id}`, input)
      return res.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["datasets"] })
      qc.invalidateQueries({ queryKey: ["datasets", vars.id] })
    },
  })
}

export function useDeleteDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/datasets/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["datasets"] }),
  })
}

export type RunOptions = {
  params?: Record<string, string>
  cache?: boolean
}

export function useRunDataset(id: string) {
  type RunResult = {
    columns: string[]
    rows: { values: string[] }[]
    rowCount: number
    executionTimeMs: number
    cached?: boolean
    total?: number
  }
  return useMutation({
    mutationFn: async (opts?: RunOptions) => {
      const res = await api.post<RunResult>(`/datasets/${id}/run`, opts ?? {})
      return res.data
    },
  })
}
