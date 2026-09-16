import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

// Types — pola PortoNext
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
      const { data } = await api.get<SessionsResponse>("/auth/sessions", { params })
      return data
    },
  })
}
