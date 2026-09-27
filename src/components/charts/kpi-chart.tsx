import type { Panel } from "@/hooks/use-dashboards"
import type { RunData } from "@/lib/chart"
import { aggregate } from "@/lib/chart"

type Props = {
  panel: Panel
  data: RunData | null | undefined
  preview?: boolean
}

export function KpiChart({ panel, data, preview = false }: Props) {
  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    )
  }
  const cfg = (panel.config as Record<string, unknown>) ?? {}
  const column = Number(cfg.column) || 0
  const agg = (cfg.agg as string) || "sum"
  const vals = data.rows
    .map((r) => r.values[column])
    .filter((v) => v !== null && v !== undefined && v !== "")
  const val = aggregate(vals, agg)
  const label = data.columns[column] ?? data.columns[0] ?? "KPI"

  if (preview) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <span className="text-xl font-bold">{val.toLocaleString()}</span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-3xl font-bold mt-1">{val.toLocaleString()}</span>
    </div>
  )
}
