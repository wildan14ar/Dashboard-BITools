import ReactECharts from "echarts-for-react"
import type { Panel } from "@/hooks/use-dashboards"
import { buildChartOption } from "@/lib/chart"
import type { RunData } from "@/lib/chart"

type Props = {
  panel: Panel
  data: RunData | null | undefined
  preview?: boolean
  chartType?: string
}

export function EChart({ panel, data, preview = false, chartType }: Props) {
  const cfg = (panel.config ?? {}) as Record<string, unknown>
  const rawType = chartType ?? panel.chartType
  const resolvedType =
    rawType === "line" || rawType === "area"
      ? cfg.lineFill ? "area" : "line"
      : rawType
  const option = data === undefined ? null : buildChartOption({ ...panel, chartType: resolvedType }, data ?? null)
  if (!option) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
  }
  return (
    <ReactECharts
      option={option}
      notMerge
      style={{ height: preview ? 120 : "100%", width: "100%" }}
    />
  )
}