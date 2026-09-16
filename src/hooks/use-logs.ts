import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

// Types — pola PortoNext
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

  return useQuery({
    queryKey: logKeys.list(queryParams),
    queryFn: async () => {
      const { data } = await api.get("/platform/logs", { params: queryParams })
      return data as {
        items: ActivityLog[]
        pagination: { page: number; limit: number; total: number }
      }
    },
  })
}
