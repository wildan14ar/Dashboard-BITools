import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import type { SourceInput, SourceConfig } from "@/validation/source"

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
      const { data } = await axios.get<Source[]>("/api/sources")
      return data
    },
  })
}

export function useSource(id: string) {
  return useQuery({
    queryKey: ["sources", id],
    queryFn: async () => {
      const { data } = await axios.get<Source>(`/api/sources/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SourceInput) => {
      const { data } = await axios.post("/api/sources", input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  })
}

export function useUpdateSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: SourceInput & { id: string }) => {
      const { data } = await axios.put(`/api/sources/${id}`, input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  })
}

export function useDeleteSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/sources/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  })
}

export function useTestSource() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.post(`/api/sources/${id}/test`)
      return data as { ok: boolean; error?: string }
    },
  })
}

export function useTestSourceAdhoc() {
  return useMutation({
    mutationFn: async (input: { type: string; config: SourceConfig }) => {
      const { data } = await axios.post("/api/sources/test", input)
      return data as { ok: boolean; error?: string }
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
      const { data } = await axios.get<{ tables: TableItem[] }>(`/api/sources/${id}/schema`)
      return data.tables ?? []
    },
    enabled: !!id,
  })
}
