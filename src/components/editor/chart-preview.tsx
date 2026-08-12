"use client"

import { PanelBody } from "@/components/dashboard-grid"
import type { Panel } from "@/hooks/use-dashboards"
import type { PreviewData } from "./use-panel-editor"

export function ChartPreview({ chartType, data, title, config }: {
  chartType: string
  data: PreviewData
  title: string
  config: {
    titlePosition?: string
    titleAlign?: string
    titleBold?: boolean
    titleItalic?: boolean
    titleStrikethrough?: boolean
    titleColor?: string
    titleSize?: number
    padding?: number
  }
}) {
  const titlePosition = config.titlePosition || "top"
  const titleAlign = config.titleAlign || "left"
  const titleBold = config.titleBold || false
  const titleItalic = config.titleItalic || false
  const titleStrikethrough = config.titleStrikethrough || false
  const titleColor = config.titleColor || ""
  const titleSize = config.titleSize || 12
  const padding = config.padding || 8

  const panel: Panel = {
    id: "_preview",
    dashboardId: "_preview",
    title,
    chartType,
    dataSetId: "_preview",
    config: {},
    x: 0, y: 0, w: 1, h: 1,
  }

  const titleStyle: React.CSSProperties = {
    textAlign: titleAlign as "left" | "center" | "right",
    fontSize: titleSize,
    fontWeight: titleBold ? "bold" : "normal",
    fontStyle: titleItalic ? "italic" : "normal",
    textDecoration: titleStrikethrough ? "line-through" : "none",
    color: titleColor || undefined,
  }

  return (
    <div className="rounded border overflow-hidden">
      {titlePosition !== "none" && title && (
        <div className="px-2 py-1">
          <span style={titleStyle}>{title}</span>
        </div>
      )}
      <div className="overflow-hidden" style={{ padding }}>
        <PanelBody panel={panel} data={data} preview />
      </div>
    </div>
  )
}
