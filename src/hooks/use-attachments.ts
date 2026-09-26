import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

// Types
export interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  createdAt?: string
  user?: {
    id: string
    fullname: string | null
    email: string
    username: string
  } | null
}

export interface AttachmentsResponse {
  items: Attachment[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_more: boolean
  }
}

// Query Keys
export const attachmentKeys = {
  all: ["attachments"] as const,
  list: (params?: { isAdmin?: boolean; page?: number; limit?: number }) =>
    [...attachmentKeys.all, "list", params] as const,
}

// Hooks
export function useAttachments(params?: { isAdmin?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: attachmentKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<AttachmentsResponse>("/attachments", { params })
      return data
    },
    staleTime: 1000 * 60,
  })
}

/** Upload satu file ke POST /api/attachments, kembalikan { id, fileUrl, ... }. */
export async function uploadAttachment(file: File): Promise<Attachment> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await api.post<Attachment>("/attachments", formData)
  return data
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.all })
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attachments/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.all })
    },
  })
}
