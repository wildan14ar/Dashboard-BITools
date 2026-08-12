import ReactECharts from "echarts-for-react"
import type { Panel } from "@/hooks/use-dashboards"
import { buildChartOption } from "@/lib/chart"
import type { RunData } from "@/lib/chart"

type Props = {
  panel: Panel
  data: RunData | null | undefined
  preview?: boolean
}

export function BarChart({ panel, data, preview = false }: Props) {
  const option = data === undefined ? null : buildChartOption({ ...panel, chartType: "bar" }, data ?? null)
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
