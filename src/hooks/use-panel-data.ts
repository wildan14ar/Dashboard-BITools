"use client"

import { useEffect, useState } from "react"
import { useDashboardFilters } from "@/hooks/use-dashboard-filters"
import api from "@/lib/api"
import type { RunData } from "@/lib/chart"

type PanelLike = { id: string; dataSetId: string | null; config?: Record<string, unknown> | null }

type FilterDef = {
  column: string
  type: "date_range" | "enum"
  from?: string
  to?: string
  value?: string
}

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
    const paramsOf = (panel: PanelLike) => {
      const own = filtersToParams((panel.config?.filters as FilterDef[]) ?? [])
      return { ...globalValues, ...own }
    }
    const runAll = async () => {
      let results: Record<string, RunData | null>
      try {
        // Satu round-trip untuk semua panel; fallback ke per-panel bila batch gagal.
        results = await runViaBatch(panels, paramsOf)
      } catch {
        results = await runPerPanel(panels, paramsOf)
      }
      if (!cancelled) setPanelData(results)
    }
    runAll()
    return () => {
      cancelled = true
    }
  }, [panels, globalValues])

  return panelData
}

type BatchItemResult = { datasetId: string; data: RunData | null; error: string | null }

async function runViaBatch(
  panels: PanelLike[],
  paramsOf: (panel: PanelLike) => Record<string, string>,
): Promise<Record<string, RunData | null>> {
  const res = await api.post<BatchItemResult[]>(
    "/datasets/run-batch",
    {
      items: panels.flatMap((p) =>
        p.dataSetId ? [{ datasetId: p.dataSetId, params: paramsOf(p) }] : [],
      ),
      useCache: false,
    },
    { timeoutMs: 300_000 },
  )
  const results: Record<string, RunData | null> = {}
  const dataByDataset = new Map((res.data ?? []).map((r) => [r.datasetId, r.data]))
  for (const panel of panels) {
    if (!panel.dataSetId) continue
    results[panel.id] = dataByDataset.get(panel.dataSetId) ?? null
  }
  return results
}

async function runPerPanel(
  panels: PanelLike[],
  paramsOf: (panel: PanelLike) => Record<string, string>,
): Promise<Record<string, RunData | null>> {
  const results: Record<string, RunData | null> = {}
  await Promise.all(
    panels.map(async (panel) => {
      if (!panel.dataSetId) return
      try {
        const res = await api.post<RunData | null>(
          `/datasets/${panel.dataSetId}/run`,
          {
            cache: false,
            params: paramsOf(panel),
          },
          { timeoutMs: 180_000 },
        )
        results[panel.id] = res.data ?? null
      } catch {
        results[panel.id] = null
      }
    }),
  )
  return results
}
