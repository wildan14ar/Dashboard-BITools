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
    // Tidak ada panel yang terikat dataset → tidak perlu memanggil engine.
    if (!panels.some((p) => p.dataSetId)) {
      setPanelData({})
      return
    }
    // Tandai null lebih dulu supaya tidak tampil "loading" selama request.
    setPanelData(emptyResults(panels))
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
      } catch (err) {
        // 401 = tidak punya sesi/API key. Fallback per-panel akan 401 juga,
        // jadi jangan dibuang request sia-sia. Tandai `null` (bukan undefined)
        // supaya PanelBody menampilkan "No data", bukan spinner abadi.
        if (isAuthError(err)) {
          if (!cancelled) setPanelData(emptyResults(panels))
          return
        }
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

/** Pesan yang dilempar api.ts saat 401/403. */
function isAuthError(err: unknown): boolean {
  return err instanceof Error && /session expired|permission to access/i.test(err.message)
}

/** Semua panel ber-dataset → null ("no data"), bukan undefined (loading). */
function emptyResults(panels: PanelLike[]): Record<string, RunData | null> {
  return Object.fromEntries(panels.filter((p) => p.dataSetId).map((p) => [p.id, null]))
}

async function runViaBatch(
  panels: PanelLike[],
  paramsOf: (panel: PanelLike) => Record<string, string>,
): Promise<Record<string, RunData | null>> {
  const items = panels.flatMap((p) =>
    p.dataSetId ? [{ datasetId: p.dataSetId, params: paramsOf(p) }] : [],
  )
  // batchRunSchema mewajibkan items.min(1) — dashboard yang seluruh panelnya
  // tanpa dataset (mis. panel teks) akan 400 bila tetap dikirim.
  if (items.length === 0) return {}

  const res = await api.post<BatchItemResult[]>(
    "/datasets/run-batch",
    { items, useCache: false },
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
