import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ulid } from "ulid"
import api from "@/lib/api"
import type { SourceType } from "@/validations/source"

export interface BiSource {
  id: string
  name: string
  type: string
  config: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface CreateSourceInput {
  name: string
  type: SourceType
  config: Record<string, unknown>
}

export interface UpdateSourceInput {
  name?: string
  type?: SourceType
  config?: Record<string, unknown>
}

export const sourceKeys = {
  all: ["sources"] as const,
  list: () => [...sourceKeys.all, "list"] as const,
  detail: (id: string) => [...sourceKeys.all, "detail", id] as const,
  schema: (id: string) => [...sourceKeys.all, "schema", id] as const,
}

export function useSources() {
  return useQuery({
    queryKey: sourceKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<BiSource[]>("/sources")
      return data
    },
  })
}

export function useSource(id: string | null) {
  return useQuery({
    queryKey: sourceKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data } = await api.get<BiSource>(`/sources/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSourceInput) => {
      const { data } = await api.post<BiSource>("/sources", input, {
        idempotencyKey: ulid(),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.all })
    },
  })
}

export function useUpdateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSourceInput & { id: string }) => {
      const { data } = await api.put<BiSource>(`/sources/${id}`, input)
      return data
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.all })
      queryClient.invalidateQueries({ queryKey: sourceKeys.detail(vars.id) })
    },
  })
}

export function useDeleteSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/sources/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.all })
    },
  })
}

/** Test koneksi untuk config yang belum disimpan (form create). */
export function useTestSourceConfig() {
  return useMutation({
    mutationFn: async (input: CreateSourceInput) => {
      const { data } = await api.post<{ ok: boolean; error?: string }>("/sources/test", input, {
        timeoutMs: 60_000,
      })
      return data
    },
  })
}

/** Test koneksi source tersimpan. */
export function useTestSource() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ ok: boolean; error?: string }>(
        `/sources/${id}/test`,
        undefined,
        { timeoutMs: 60_000 },
      )
      return data
    },
  })
}

export interface SchemaForeignKey {
  table?: string
  column?: string
}

export interface SchemaColumn {
  name?: string
  type?: string
  nullable?: boolean
  isPrimaryKey?: boolean
  foreignKey?: SchemaForeignKey | null
}

export interface SchemaTable {
  name?: string
  schema?: string
  type?: string
  columns?: SchemaColumn[]
}

export interface SchemaInfo {
  tables?: SchemaTable[]
}

/** Bentuk tabel yang sudah dinormalisasi untuk Database Explorer. */
export interface TableItem {
  name: string
  schema: string
  type: "table" | "view" | "notice"
  columns: {
    name: string
    type: string
    nullable: boolean
    isPrimaryKey?: boolean
    foreignKey?: { table: string; column: string } | null
  }[]
}

function normalizeSchema(data: SchemaInfo | null | undefined): TableItem[] {
  return (data?.tables ?? []).map((t) => ({
    name: t.name ?? "",
    schema: t.schema || "public",
    type: (t.type as TableItem["type"]) ?? "table",
    columns: (t.columns ?? []).map((c) => ({
      name: c.name ?? "",
      type: c.type ?? "",
      nullable: c.nullable !== false,
      isPrimaryKey: c.isPrimaryKey === true,
      foreignKey: c.foreignKey?.table
        ? { table: c.foreignKey.table, column: c.foreignKey.column ?? "" }
        : null,
    })),
  }))
}

/** Ambil schema (daftar tabel + kolom) source tersimpan. */
export function useSourceSchema(id: string | null) {
  return useQuery({
    queryKey: sourceKeys.schema(id ?? ""),
    queryFn: async () => {
      // Introspeksi DB remote bisa >10 detik — timeout panjang + cache 5 menit.
      const { data } = await api.get<SchemaInfo>(`/sources/${id}/schema`, {
        timeoutMs: 120_000,
      })
      return normalizeSchema(data)
    },
    enabled: !!id,
    staleTime: 5 * 60_1000,
    gcTime: 10 * 60_1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

const CHUNK_SIZE = 5 * 1024 * 1024

function randomUploadId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export interface UploadedFile {
  path: string
  size: number
}

/**
 * Upload chunked untuk source file. Sequential per requirement API,
 * pakai fetch mentah agar tidak memicu toast per chunk.
 */
export async function uploadSourceFile(
  file: File,
  onProgress?: (received: number, total: number) => void,
): Promise<UploadedFile> {
  const uploadId = randomUploadId()
  const totalChunks = Math.max(Math.ceil(file.size / CHUNK_SIZE), 1)
  let last: UploadedFile | null = null

  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    const form = new FormData()
    form.set("uploadId", uploadId)
    form.set("chunkIndex", String(i))
    form.set("totalChunks", String(totalChunks))
    form.set("filename", file.name)
    form.set("chunk", chunk, file.name)

    const res = await fetch("/api/sources/upload", {
      method: "POST",
      body: form,
      credentials: "same-origin",
    })
    const body = (await res.json().catch(() => null)) as {
      success?: boolean
      message?: string
      data?: { received?: number; totalChunks?: number; path?: string; size?: number }
    } | null
    if (!res.ok || !body?.success) {
      throw new Error(body?.message || "Upload gagal")
    }
    if (body.data?.path) {
      last = { path: body.data.path, size: body.data.size ?? file.size }
    }
    onProgress?.(body.data?.received ?? i + 1, totalChunks)
  }

  if (!last) throw new Error("Upload gagal: respons final tidak lengkap")
  return last
}
