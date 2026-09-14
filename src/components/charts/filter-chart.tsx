"use client"

import { Input } from "@/components/ui/input"
import { useDashboardFilters } from "@/hooks/use-dashboard-filters"
import type { Panel } from "@/hooks/use-dashboards"
import type { PanelFilter } from "@/hooks/use-panel-editor"
import type { RunData } from "@/lib/chart"

type Props = {
  panel: Panel
  data: RunData | null | undefined
  preview?: boolean
}

export function FilterChart({ panel, data }: Props) {
  const cfg = (panel.config ?? {}) as Record<string, unknown>
  const filters = (cfg.filters as PanelFilter[]) ?? []
  const { values, setValue } = useDashboardFilters()

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-2">
      {filters.map((f) => {
        const key = f.column
        if (f.type === "date_range") {
          const from = values[`${key}_from`] ?? ""
          const to = values[`${key}_to`] ?? ""
          return (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">{key}</span>
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setValue(`${key}_from`, e.target.value)}
                  className="h-7 min-w-0 px-1 text-[10px]"
                />
                <span className="text-[10px] text-muted-foreground">–</span>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setValue(`${key}_to`, e.target.value)}
                  className="h-7 min-w-0 px-1 text-[10px]"
                />
              </div>
            </div>
          )
        }

        const colIdx = (data?.columns ?? []).indexOf(key)
        const options = Array.from(
          new Set((data?.rows ?? []).map((r) => r.values[colIdx]).filter(Boolean)),
        )
        return (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">{key}</span>
            <select
              value={values[key] ?? ""}
              onChange={(e) => setValue(key, e.target.value)}
              className="h-7 w-full rounded-md border bg-background px-1 text-[10px]"
            >
              <option value="">All</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
