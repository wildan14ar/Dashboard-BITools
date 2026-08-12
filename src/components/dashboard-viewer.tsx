"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import GridLayout from "react-grid-layout"
import { Loader2 } from "lucide-react"
import "@/components/react-grid.css"
import { useDashboard } from "@/hooks/use-dashboards"
import { PanelBody } from "@/components/dashboard-grid"
import { cn } from "@/lib/utils"
import type { RunData } from "@/lib/chart"

type Props = {
  id: string
  variant: "public" | "embed"
  requirePublic?: boolean
}

export default function DashboardViewer({ id, variant, requirePublic = false }: Props) {
  const { data: dashboard, isLoading } = useDashboard(id)
  const [panelData, setPanelData] = useState<Record<string, RunData | null>>({})

  useEffect(() => {
    if (!dashboard?.panels) return
    let cancelled = false
    const runAll = async () => {
      const results: Record<string, RunData | null> = {}
      await Promise.all(
        dashboard.panels!.map(async (panel) => {
          if (!panel.dataSetId) return
          try {
            const res = await axios.post(`/api/datasets/${panel.dataSetId}/run`, { cache: false })
            results[panel.id] = res.data ?? null
          } catch {
            results[panel.id] = null
          }
        })
      )
      if (!cancelled) setPanelData(results)
    }
    runAll()
    return () => {
      cancelled = true
    }
  }, [dashboard])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  if (!dashboard || (requirePublic && !dashboard.isPublic)) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Dashboard not found</div>
  }

  const layout = dashboard.panels!.map((p) => ({ i: p.id, x: p.x, y: p.y, w: p.w, h: p.h, static: true }))
  const isEmbed = variant === "embed"

  return (
    <div
      className={cn("h-screen bg-background", !isEmbed && "bg-muted/10 p-4")}
      style={{ margin: 0, overflow: "hidden" }}
    >
      {!isEmbed && (
        <div className="mb-3">
          <h1 className="text-lg font-semibold">{dashboard.name}</h1>
        </div>
      )}
      <GridLayout
        className="layout"
        layout={layout}
        gridConfig={{ cols: 12, rowHeight: isEmbed ? 50 : 60 }}
        width={window.innerWidth - (isEmbed ? 8 : 32)}
        dragConfig={{ enabled: false }}
        resizeConfig={{ enabled: false }}
      >
        {dashboard.panels!.map((panel) => (
          <div key={panel.id} className={cn("overflow-hidden border bg-card", isEmbed ? "rounded" : "rounded-lg shadow-sm")}>
            <div className={cn("border-b", isEmbed ? "px-2 py-0.5" : "px-3 py-1.5")}>
              <h3 className={cn("truncate font-medium", isEmbed ? "text-[10px]" : "text-xs")}>{panel.title}</h3>
            </div>
            <div className={cn(isEmbed ? "h-[calc(100%-20px)]" : "h-[calc(100%-32px)]")}>
              {panel.dataSetId ? (
                <PanelBody panel={panel} data={panelData[panel.id]} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No dataset</div>
              )}
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  )
}
