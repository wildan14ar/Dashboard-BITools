"use client"

import { useEffect, useState } from "react"
import api from "@/lib/axios"
import type { RunData } from "@/lib/chart"
import { useDashboardFilters } from "@/hooks/use-dashboard-filters"

type PanelLike = { id: string; dataSetId: string; config?: Record<string, unknown> | null }

type FilterDef = { column: string; type: "date_range" | "enum"; from?: string; to?: string; value?: string }

export function filtersToParams(filters: FilterDef[] | undefined): Record<string, string> {
  const params: Record<string, string> = {}
  for (const f of filters ?? []) {
    if (f.type === "date_range") {
      if (f.from) params[`${f.column}_from`] = f.from
      if (f.to) params[`${f.column}_to`] = f.to
    } else if (f.value) {
      params[f.column] = f.value
    }
  }
  return params
}

export function usePanelData(panels: PanelLike[] | null | undefined) {
  const [panelData, setPanelData] = useState<Record<string, RunData | null>>({})
  const { values: globalValues } = useDashboardFilters()

  useEffect(() => {
    if (!panels?.length) return
    let cancelled = false
    const runAll = async () => {
      const results: Record<string, RunData | null> = {}
      await Promise.all(
        panels.map(async (panel) => {
          if (!panel.dataSetId) return
          try {
            const own = filtersToParams((panel.config?.filters as FilterDef[]) ?? [])
            const params = { ...globalValues, ...own }
            const res = await api.post<RunData | null>(`/datasets/${panel.dataSetId}/run`, { cache: false, params })
            results[panel.id] = res ?? null
          } catch {
            results[panel.id] = null
          }
        })
      )
      if (!cancelled) setPanelData(results)
    }
    runAll()
    return () => {
      cancelled = true
    }
  }, [panels, globalValues])

  return panelData
}