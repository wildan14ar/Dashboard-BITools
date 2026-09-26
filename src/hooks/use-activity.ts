import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

// ============================================================================
// Activity Logs (/users/logs)
// ============================================================================

export interface ActivityLog {
  id: string
  action: string
  entity: string
  entityId: string | null
  metadata: unknown
  ip: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    username: string
    fullname: string | null
    email: string | null
  }
}

export const logKeys = {
  all: ["logs"] as const,
  list: (params: Record<string, string | undefined>) => [...logKeys.all, params] as const,
}

export function useLogs(params: {
  page?: number
  limit?: number
  search?: string
  action?: string
  entity?: string
  userId?: string
  sort?: string
  order?: string
  isAdmin?: boolean
}) {
  const queryParams: Record<string, string> = {}
  if (params.page) queryParams.page = String(params.page)
  if (params.limit) queryParams.limit = String(params.limit)
  if (params.search) queryParams.search = params.search
  if (params.action) queryParams.action = params.action
  if (params.entity) queryParams.entity = params.entity
  if (params.userId) queryParams.userId = params.userId
  if (params.sort) queryParams.sort = params.sort
  if (params.order) queryParams.order = params.order
  if (params.isAdmin) queryParams.isAdmin = "true"

  return useQuery({
    queryKey: logKeys.list(queryParams),
    queryFn: async () => {
      const { data } = await api.get("/users/logs", { params: queryParams })
      return data as {
        items: ActivityLog[]
        pagination: {
          page: number
          limit: number
          total: number
          total_pages: number
          has_more: boolean
        }
      }
    },
  })
}

// ============================================================================
// Sessions (/users/sessions)
// ============================================================================

export interface SessionUser {
  id: string
  username: string
  fullname: string | null
  email: string | null
}

export interface Session {
  id: string
  isCurrent: boolean
  userId: string
  user?: SessionUser
  expiresAt: string
  createdAt: string
  lastActiveAt: string
  ipAddress: string | null
  userAgent: string | null
}

export interface SessionsResponse {
  items: Session[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_more: boolean
  }
}

export const sessionsKeys = {
  all: ["sessions"] as const,
  list: (params: { page: number; limit: number; search?: string; isAdmin?: boolean }) =>
    [...sessionsKeys.all, params] as const,
}

export function useSessions(params: {
  page: number
  limit: number
  search?: string
  isAdmin?: boolean
}) {
  return useQuery({
    queryKey: sessionsKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<SessionsResponse>("/users/sessions", { params })
      return data
    },
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/users/sessions/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKeys.all })
    },
  })
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (opts?: { userId?: string; all?: boolean }) => {
      const params: Record<string, string> = {}
      if (opts?.userId) params.userId = opts.userId
      if (opts?.all) params.all = "true"
      const { data } = await api.delete<{ revoked: number }>("/users/sessions", {
        params: Object.keys(params).length > 0 ? params : undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKeys.all })
    },
  })
}
