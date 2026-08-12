"use client"

import { PanelBody } from "@/components/dashboard-grid"
import type { Panel } from "@/hooks/use-dashboards"
import type { PreviewData } from "./use-panel-editor"

export function ChartPreview({ chartType, data, config }: {
  chartType: string
  data: PreviewData
  config: Record<string, unknown>
  title: string
}) {
  const panel: Panel = {
    id: "_preview",
    dashboardId: "_preview",
    title: "",
    chartType,
    dataSetId: "_preview",
    config,
    x: 0, y: 0, w: 1, h: 1,
  }

  const pad = Number(config.padding) || 8

  return (
    <div className="rounded border overflow-hidden">
      <div className="overflow-hidden" style={{ padding: pad }}>
        <PanelBody panel={panel} data={data} preview />
      </div>
    </div>
  )
}
