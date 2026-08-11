import type { Panel } from "@/hooks/use-dashboards"

export type RunData = { columns: string[]; rows: { values: string[] }[] }

export const CHART_COLORS = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4"]

export function buildChartOption(panel: Panel, data: RunData | null) {
  if (!data || data.rows.length === 0) return null
  const rows = data.rows.map((r) => r.values)
  const cfg = (panel.config as Record<string, unknown>) ?? {}
  const xIdx = (cfg.xColumn as number) ?? 0
  const yIdx = (cfg.yColumn as number) ?? 1
  return {
    color: CHART_COLORS,
    tooltip: { trigger: "axis" as const },
    grid: { left: 30, right: 6, top: 6, bottom: 20 },
    xAxis: { type: "category" as const, data: rows.map((r) => r[xIdx] ?? ""), axisLabel: { fontSize: 9 } },
    yAxis: { type: "value" as const, axisLabel: { fontSize: 9 } },
    series: [{ type: panel.chartType as never, data: rows.map((r) => parseFloat(r[yIdx]) || 0), smooth: true }],
  }
}