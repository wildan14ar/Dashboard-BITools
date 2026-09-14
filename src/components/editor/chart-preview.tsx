"use client"

import { PanelBody } from "@/components/dashboard/dashboard-grid"
import { renderPanelTitle, type TitleConfig } from "@/components/dashboard/panel-title"
import type { Panel } from "@/hooks/use-dashboards"
import type { PreviewData } from "@/hooks/use-panel-editor"

export function ChartPreview({
  chartType,
  data,
  title,
  config,
  chartConfig,
}: {
  chartType: string
  data: PreviewData
  title: string
  config: TitleConfig
  chartConfig?: Record<string, unknown>
}) {
  const titlePosition = config.titlePosition || "top"
  const padding = config.padding ?? 8
  const titleEl = renderPanelTitle(title, config)

  const panel: Panel = {
    id: "_preview",
    dashboardId: "_preview",
    title,
    chartType,
    dataSetId: "_preview",
    config: chartConfig ?? {},
    x: 0,
    y: 0,
    w: 1,
    h: 1,
  }

  return (
    <div className="rounded border overflow-hidden">
      {titlePosition === "top" && titleEl}
      <div className="overflow-hidden" style={{ padding }}>
        <PanelBody panel={panel} data={data} preview />
      </div>
      {titlePosition === "bottom" && titleEl}
    </div>
  )
}
