import type { Panel } from "@/hooks/use-dashboards"

export type RunData = {
  columns: string[]
  rows: { values: string[] }[]
  cached?: boolean
  execution_time_ms?: number
  row_count?: number
}

export const CHART_COLORS = [
  "#5470c6",
  "#91cc75",
  "#fac858",
  "#ee6666",
  "#73c0de",
  "#3ba272",
  "#fc8452",
  "#9a60b4",
]

export function aggregate(values: string[], agg: string): number {
  const nums = values.map((v) => parseFloat(v)).filter((n) => !Number.isNaN(n))
  switch (agg) {
    case "count":
      return nums.length
    case "sum":
      return nums.reduce((a, b) => a + b, 0)
    case "avg":
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
    case "min":
      return nums.length ? Math.min(...nums) : 0
    case "max":
      return nums.length ? Math.max(...nums) : 0
    default:
      return 0
  }
}

export function buildChartOption(panel: Panel, data: RunData | null) {
  if (!data || data.rows.length === 0) return null
  const rows = data.rows.map((r) => r.values)
  const cfg = (panel.config as Record<string, unknown>) ?? {}
  const xIdx = (cfg.xColumn as number) ?? 0
  const yIdx = (cfg.yColumn as number) ?? 1

  if (panel.chartType === "pie") {
    const pieMode = (cfg.pieMode as string) || "donut"
    const thickness = Number(cfg.donutThickness) || 45
    const radius = pieMode === "pie" ? ["0%", `${thickness}%`] : [`${100 - thickness}%`, "80%"]
    return {
      color: CHART_COLORS,
      title: { show: false },
      tooltip: { trigger: "item" as const },
      series: [
        {
          type: "pie" as const,
          radius,
          label: { fontSize: 9 },
          data: rows.map((r) => ({ name: r[xIdx] ?? "", value: parseFloat(r[yIdx]) || 0 })),
        },
      ],
    }
  }

  const isArea = panel.chartType === "area"
  const type: "line" | "bar" = isArea ? "line" : panel.chartType === "line" ? "line" : "bar"
  const horizontalBar = type === "bar" && (cfg.barOrientation as string) === "horizontal"
  const categories = rows.map((r) => r[xIdx] ?? "")

  return {
    color: CHART_COLORS,
    title: { show: false },
    tooltip: { trigger: "axis" as const },
    grid: horizontalBar
      ? { left: 60, right: 10, top: 6, bottom: 10 }
      : { left: 30, right: 6, top: 6, bottom: 20 },
    xAxis: horizontalBar
      ? { type: "value" as const, axisLabel: { fontSize: 9 } }
      : { type: "category" as const, data: categories, axisLabel: { fontSize: 9 } },
    yAxis: horizontalBar
      ? { type: "category" as const, data: categories, axisLabel: { fontSize: 9 } }
      : { type: "value" as const, axisLabel: { fontSize: 9 } },
    series: [
      {
        type,
        data: rows.map((r) => parseFloat(r[yIdx]) || 0),
        smooth: true,
        areaStyle: isArea ? { opacity: 0.3 } : undefined,
        ...(type === "bar" ? { itemStyle: { borderRadius: [4, 4, 0, 0] } } : {}),
      },
    ],
  }
}
