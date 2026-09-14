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
  const ms = data.execution_time_ms
  const time = ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`
  return (
    <span
      title={cached ? `Disajikan dari cache dalam ${time}` : `Live query dalam ${time}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        cached
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", cached ? "bg-amber-500" : "bg-emerald-500")} />
      {cached ? "cached" : "live"} · {time}
    </span>
  )
}
