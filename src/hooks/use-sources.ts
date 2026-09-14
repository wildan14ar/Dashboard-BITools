import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { SourceConfig, SourceInput } from "@/validations/source"

export type Source = {
  id: string
  name: string
  type: SourceInput["type"]
  config: SourceConfig | null
  createdAt: string
}

export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const res = await api.get<Source[]>("/sources")
      return res.data
    },
  })
}

export function useSource(id: string) {
  return useQuery({
    queryKey: ["sources", id],
    queryFn: async () => {
      const res = await api.get<Source>(`/sources/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SourceInput) => {
      const res = await api.post("/sources", input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  })
}

export function useUpdateSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: SourceInput & { id: string }) => {
      const res = await api.put(`/sources/${id}`, input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  })
}

export function useDeleteSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sources/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  })
}

export function useTestSource() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ ok: boolean; error?: string }>(`/sources/${id}/test`)
      return res.data
    },
  })
}

export function useTestSourceAdhoc() {
  return useMutation({
    mutationFn: async (input: { type: string; config: SourceConfig }) => {
      const res = await api.post<{ ok: boolean; error?: string }>("/sources/test", input)
      return res.data
    },
  })
}

export type ColumnInfo = {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey?: boolean
  foreignKey?: { table: string; column: string } | null
}

export type TableItem = {
  name: string
  schema: string
  type: "table" | "view"
  columns: ColumnInfo[]
}

export function useSourceSchema(id: string) {
  return useQuery({
    queryKey: ["sources", id, "schema"],
    queryFn: async () => {
      const res = await api.get<{ tables: TableItem[] }>(`/sources/${id}/schema`)
      return res.data.tables ?? []
    },
    enabled: !!id,
  })
}
