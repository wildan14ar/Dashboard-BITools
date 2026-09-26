import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ulid } from "ulid"
import api from "@/lib/api"

// Types
export interface Notification {
  id: string
  userId: string
  title: string
  body: string | null
  link: string | null
  isRead: boolean
  type: string
  calendarId: string | null
  createdAt: string
}

export interface NotificationsResponse {
  items: Notification[]
  pagination:
    | { page: number; limit: number; total: number; total_pages: number; has_more: boolean }
    | { next_cursor: string | null; has_more: boolean }
  unreadCount: number
}

export interface MarkReadResponse {
  success: boolean
  unreadCount?: number
}

// Query Keys
export const notifKeys = {
  all: ["notifications"] as const,
  list: (params: Record<string, string | undefined>) => [...notifKeys.all, params] as const,
}

// Hooks
export function useNotifications(params: {
  page?: number
  limit?: number
  type?: string
  unread?: boolean
}) {
  const queryParams: Record<string, string> = {}
  if (params.page) queryParams.page = String(params.page)
  if (params.limit) queryParams.limit = String(params.limit)
  if (params.type) queryParams.type = params.type
  if (params.unread) queryParams.filter = "unread"

  return useQuery({
    queryKey: notifKeys.list(queryParams),
    queryFn: async () => {
      const { data } = await api.get<NotificationsResponse>("/notifications", {
        params: queryParams,
      })
      return data
    },
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put<MarkReadResponse>(`/notifications/${id}/read`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put<MarkReadResponse>("/notifications/read-all")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all })
    },
  })
}

export interface BroadcastInput {
  title: string
  body?: string
  link?: string
  type?: string
  /** Kosongkan keduanya = semua user aktif. */
  userIds?: string[]
  usernames?: string[]
  /** Opsional: kaitkan ke event calendar. */
  calendarId?: string
}

export interface BroadcastResult {
  sent: number
  skipped: number
}

export function useBroadcast() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BroadcastInput) => {
      // Key unik per pengiriman agar retry tombol tidak ganda.
      const { data } = await api.post<BroadcastResult>("/notifications/broadcast", input, {
        idempotencyKey: ulid(),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all })
    },
  })
}
