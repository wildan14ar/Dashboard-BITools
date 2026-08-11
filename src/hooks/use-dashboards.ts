import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import type { DashboardInput } from "@/validation/dashboard"

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
      const { data } = await axios.get<Dashboard[]>("/api/dashboards")
      return data
    },
  })
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: ["dashboards", id],
    queryFn: async () => {
      const { data } = await axios.get<Dashboard>(`/api/dashboards/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DashboardInput) => {
      const { data } = await axios.post("/api/dashboards", input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards"] }),
  })
}

export function useDeleteDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/dashboards/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards"] }),
  })
}

export function useCreatePanel(dashboardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await axios.post(`/api/dashboards/${dashboardId}/panels`, input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards", dashboardId] }),
  })
}

export function useUpdatePanel(dashboardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ panelId, ...input }: Record<string, unknown> & { panelId: string }) => {
      const { data } = await axios.put(`/api/dashboards/${dashboardId}/panels/${panelId}`, input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards", dashboardId] }),
  })
}

export function useDeletePanel(dashboardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (panelId: string) => {
      await axios.delete(`/api/dashboards/${dashboardId}/panels/${panelId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards", dashboardId] }),
  })
}

export function useReorderPanels(dashboardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (panels: { id: string; x: number; y: number; w: number; h: number }[]) => {
      const { data } = await axios.put(`/api/dashboards/${dashboardId}/panels/reorder`, panels)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards", dashboardId] }),
  })
}
