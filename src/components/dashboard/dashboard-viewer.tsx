"use client"

import { Loader2 } from "lucide-react"
import { useMemo } from "react"
import GridLayout from "react-grid-layout"
import "./react-grid.css"
import { TextChart } from "@/components/charts"
import { PanelBody } from "@/components/dashboard/dashboard-grid"
import { RunMetaBadge } from "@/components/dashboard/run-meta"
import { useAuth } from "@/hooks/use-auth"
import { DashboardFilterProvider } from "@/hooks/use-dashboard-filters"
import { type BiDashboard, useDashboard, usePublicDashboard } from "@/hooks/use-dashboards"
import { usePanelData } from "@/hooks/use-panel-data"

type Props = {
  id: string
  requirePublic?: boolean
}

const EPOCH = new Date(0).toISOString()

export default function DashboardViewer({ id, requirePublic = false }: Props) {
  // Viewer publik (/bi/[id]) tak pernah butuh endpoint privat — memanggilnya
  // hanya menghasilkan 401 yang sia-sia saat pengunjung anonim.
  const privateQuery = useDashboard(requirePublic ? null : id)
  const publicQuery = usePublicDashboard(id)
  // WAJIB di-memo: identitas array baru tiap render akan membuat efek
  // usePanelData (dependensi [panels]) berjalan terus-menerus.
  const publicPanels = useMemo(
    () =>
      publicQuery.data?.panels.map((p) => ({
        ...p,
        dashboardId: id,
        createdAt: EPOCH,
      })) ?? null,
    [publicQuery.data, id],
  )
  const dashboard: BiDashboard | undefined = privateQuery.data
    ? privateQuery.data
    : publicQuery.data && publicPanels
      ? ({ ...publicQuery.data, panels: publicPanels } as BiDashboard)
      : undefined
  const isLoading = requirePublic
    ? publicQuery.isLoading
    : privateQuery.isLoading && publicQuery.isLoading
  const panelData = usePanelData(dashboard?.panels)
  // Data panel diambil lewat run-batch yang mewajibkan session/API key.
  // Status auth dicek langsung dari session — di mode requirePublic query
  // privat sengaja dimatikan, jadi `privateQuery.data` tak bisa dijadikan
  // penanda anonim.
  const { status: authStatus } = useAuth()
  const isAnonymous = authStatus === "unauthenticated"

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  if (!dashboard || (requirePublic && !dashboard.isPublic)) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Dashboard not found
      </div>
    )
  }

  const panels = dashboard?.panels ?? []
  const layout = panels.map((p) => ({
    i: p.id,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    static: true,
  }))
  // Guard SSR: window hanya ada di browser.
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth
  const hasDataPanels = panels.some((p) => p.dataSetId)

  return (
    <DashboardFilterProvider>
      <div className="h-screen bg-muted/10 p-4" style={{ margin: 0, overflow: "hidden" }}>
        <div className="mb-3">
          <h1 className="text-lg font-semibold">{dashboard.name}</h1>
          {isAnonymous && hasDataPanels && (
            <p className="mt-1 text-xs text-muted-foreground">
              Layout & judul panel tampil publik, tetapi data memerlukan sesi login atau API key.
            </p>
          )}
        </div>
        <GridLayout
          className="layout"
          layout={layout}
          gridConfig={{ cols: 12, rowHeight: 60 }}
          width={viewportWidth - 32}
          dragConfig={{ enabled: false }}
          resizeConfig={{ enabled: false }}
        >
          {panels.map((panel) => {
            const cfg = (panel.config as Record<string, unknown>) ?? {}
            const titlePosition = (cfg.titlePosition as string) || "top"
            const showTitle = titlePosition !== "none" && !!panel.title
            return (
              <div key={panel.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
                {showTitle && (
                  <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
                    <h3 className="truncate text-xs font-medium">{panel.title}</h3>
                    <RunMetaBadge data={panelData[panel.id]} />
                  </div>
                )}
                <div className={showTitle ? "h-[calc(100%-32px)]" : "h-full"}>
                  {panel.chartType === "text" ? (
                    <TextChart panel={panel} />
                  ) : panel.dataSetId || panel.chartType === "filter" ? (
                    <PanelBody panel={panel} data={panelData[panel.id]} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No dataset
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </GridLayout>
      </div>
    </DashboardFilterProvider>
  )
}
