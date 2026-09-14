import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { DashboardInput } from "@/validations/dashboard"

export type Dashboard = {
  id: string
  name: string
  description: string | null
  tags: string[]
  isPublic: boolean
  userId: string
  createdAt: string
  updatedAt: string
  panels?: Panel[]
  _count?: { panels: number }
}

export type Panel = {
  id: string
  dashboardId: string
  dataSetId: string
  title: string
  chartType: string
  config: Record<string, unknown> | null
  x: number
  y: number
  w: number
  h: number
}

export function useDashboards() {
  return useQuery({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const res = await api.get<Dashboard[]>("/dashboards")
      return res.data
    },
  })
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: ["dashboards", id],
    queryFn: async () => {
      const res = await api.get<Dashboard>(`/dashboards/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DashboardInput) => {
      const res = await api.post<Dashboard>(`/dashboards`, input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards"] }),
  })
}

export function useDeleteDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dashboards/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards"] }),
  })
}

export function useCreatePanel(dashboardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.post(`/dashboards/${dashboardId}/panels`, input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards", dashboardId] }),
  })
}

export function useUpdatePanel(dashboardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ panelId, ...input }: Record<string, unknown> & { panelId: string }) => {
      const res = await api.put(`/dashboards/${dashboardId}/panels/${panelId}`, input)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards", dashboardId] }),
  })
}

export function useDeletePanel(dashboardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (panelId: string) => {
      await api.delete(`/dashboards/${dashboardId}/panels/${panelId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards", dashboardId] }),
  })
}

export function useReorderPanels(dashboardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (panels: { id: string; x: number; y: number; w: number; h: number }[]) => {
      const res = await api.put(`/dashboards/${dashboardId}/panels/reorder`, panels)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards", dashboardId] }),
  })
}
