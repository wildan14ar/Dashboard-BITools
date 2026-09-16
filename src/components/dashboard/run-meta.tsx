import { Badge } from "@/components/ui/badge"
import type { RunData } from "@/lib/chart"
import { cn } from "@/lib/utils"

/** Badge kecil live/cached + waktu eksekusi untuk panel dashboard. */
export function RunMetaBadge({
  data,
  className,
}: {
  data: RunData | null | undefined
  className?: string
}) {
  if (!data || data.execution_time_ms === undefined) return null
  const cached = data.cached === true
  const truncated = data.truncated === true
  const ms = data.execution_time_ms
  const time = ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`
  const base = cached ? `Disajikan dari cache dalam ${time}` : `Live query dalam ${time}`
  return (
    <Badge
      variant={cached ? "warning" : "success"}
      title={truncated ? `${base} (hasil dipotong)` : base}
      className={cn("px-1.5 py-0.5 text-[10px]", className)}
    >
      <span className={cn("size-1.5 rounded-full", cached ? "bg-amber-500" : "bg-emerald-500")} />
      {cached ? "cached" : "live"} · {time}
      {truncated ? " · dipotong" : ""}
    </Badge>
  )
}
