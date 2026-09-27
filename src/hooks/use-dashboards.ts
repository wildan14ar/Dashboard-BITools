import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ulid } from "ulid"
import api from "@/lib/api"

export interface BiPanel {
  id: string
  dashboardId: string
  dataSetId: string | null
  title: string
  chartType: string
  config: Record<string, unknown> | null
  x: number
  y: number
  w: number
  h: number
  createdAt: string
}

export interface BiFilter {
  id: string
  dashboardId: string
  name: string
  label: string
  type: string
  config: Record<string, unknown> | null
  position: number
}

export interface BiMember {
  id: string
  dashboardId: string
  userId: string
  role: "VIEWER" | "EDITOR"
  user?: { id: string; username: string; email: string }
}

export interface BiDashboard {
  id: string
  name: string
  description: string | null
  tags: string[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
  panels?: BiPanel[]
  filters?: BiFilter[]
  members?: BiMember[]
  _count?: { panels: number }
}

export interface CreateDashboardInput {
  name: string
  description?: string
  tags?: string[]
  isPublic?: boolean
}

export interface CreatePanelInput {
  title: string
  chartType?: string
  dataSetId?: string
  config?: Record<string, unknown>
}

export interface UpdatePanelInput {
  title?: string
  chartType?: string
  dataSetId?: string | null
  config?: Record<string, unknown>
  x?: number
  y?: number
  w?: number
  h?: number
}

/** Alias kompatibilitas untuk komponen visual editor. */
export type Panel = BiPanel

export const dashboardKeys = {
  all: ["dashboards"] as const,
  list: () => [...dashboardKeys.all, "list"] as const,
  detail: (id: string) => [...dashboardKeys.all, "detail", id] as const,
  public: (id: string) => [...dashboardKeys.all, "public", id] as const,
}

export function useDashboards() {
  return useQuery({
    queryKey: dashboardKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<BiDashboard[]>("/dashboards")
      return data
    },
  })
}

export function useDashboard(id: string | null) {
  return useQuery({
    queryKey: dashboardKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data } = await api.get<BiDashboard>(`/dashboards/${id}`)
      return data
    },
    enabled: !!id,
  })
}

/**
 * Dashboard PUBLIK tanpa session (dipakai /bi/[id] dan /bi/embed/[id]).
 * Endpoint menyaring isPublic + hanya panel ber-dataset, dan tidak
 * menyertakan userId/members.
 */
export function usePublicDashboard(id: string | null) {
  return useQuery({
    queryKey: dashboardKeys.public(id ?? ""),
    queryFn: async () => {
      const { data } = await api.get<PublicDashboard>(`/public/dashboards/${id}`, {
        timeoutMs: 120_000,
      })
      return data
    },
    enabled: !!id,
    staleTime: 60_000,
    retry: false,
  })
}

export type PublicDashboard = {
  id: string
  name: string
  isPublic: boolean
  panels: Pick<
    BiPanel,
    "id" | "dataSetId" | "title" | "chartType" | "config" | "x" | "y" | "w" | "h"
  >[]
}

export function useCreateDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateDashboardInput) => {
      const { data } = await api.post<BiDashboard>("/dashboards", input, {
        idempotencyKey: ulid(),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}

export function useUpdateDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: CreateDashboardInput & { id: string }) => {
      const { data } = await api.put<BiDashboard>(`/dashboards/${id}`, input)
      return data
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(vars.id) })
    },
  })
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/dashboards/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}

function invalidateDetail(queryClient: ReturnType<typeof useQueryClient>, dashboardId: string) {
  queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) })
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
}

export function useCreatePanel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dashboardId, ...input }: CreatePanelInput & { dashboardId: string }) => {
      const { data } = await api.post<BiPanel>(`/dashboards/${dashboardId}/panels`, input, {
        idempotencyKey: ulid(),
      })
      return data
    },
    onSuccess: (_data, vars) => invalidateDetail(queryClient, vars.dashboardId),
  })
}

export function useUpdatePanel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      dashboardId,
      panelId,
      ...input
    }: UpdatePanelInput & { dashboardId: string; panelId: string }) => {
      const { data } = await api.put<BiPanel>(`/dashboards/${dashboardId}/panels/${panelId}`, input)
      return data
    },
    onSuccess: (_data, vars) => invalidateDetail(queryClient, vars.dashboardId),
  })
}

export function useDeletePanel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vars: { dashboardId: string; panelId: string }) => {
      const { data } = await api.delete(`/dashboards/${vars.dashboardId}/panels/${vars.panelId}`)
      return data
    },
    onSuccess: (_data, vars) => invalidateDetail(queryClient, vars.dashboardId),
  })
}

export interface ReorderPanelInput {
  id: string
  x: number
  y: number
  w: number
  h: number
}

/** Simpan posisi/ukuran panel (drag-drop editor). */
export function useReorderPanels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vars: { dashboardId: string; panels: ReorderPanelInput[] }) => {
      const { data } = await api.put(`/dashboards/${vars.dashboardId}/panels/reorder`, vars.panels)
      return data
    },
    onSuccess: (_data, vars) => invalidateDetail(queryClient, vars.dashboardId),
  })
}

export function useSetDashboardPublic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vars: { dashboardId: string; isPublic: boolean }) => {
      const { data } = await api.put<BiDashboard>(`/dashboards/${vars.dashboardId}/public`, {
        isPublic: vars.isPublic,
      })
      return data
    },
    onSuccess: (_data, vars) => invalidateDetail(queryClient, vars.dashboardId),
  })
}

export function useAddDashboardMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vars: { dashboardId: string; userId: string; role?: string }) => {
      const { data } = await api.post<BiMember>(`/dashboards/${vars.dashboardId}/members`, {
        userId: vars.userId,
        role: vars.role ?? "VIEWER",
      })
      return data
    },
    onSuccess: (_data, vars) => invalidateDetail(queryClient, vars.dashboardId),
  })
}

export function useRemoveDashboardMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vars: { dashboardId: string; userId: string }) => {
      // API hapus member via DELETE + body { userId }.
      const res = await fetch(`/api/dashboards/${vars.dashboardId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: vars.userId }),
        credentials: "same-origin",
      })
      const body = (await res.json().catch(() => null)) as {
        success?: boolean
        message?: string
      } | null
      if (!res.ok || !body?.success) throw new Error(body?.message || "Gagal menghapus member")
      return body
    },
    onSuccess: (_data, vars) => invalidateDetail(queryClient, vars.dashboardId),
  })
}
