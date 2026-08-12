"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import type { RunData } from "@/lib/chart"

type PanelLike = { id: string; dataSetId: string }

export function usePanelData(panels: PanelLike[] | null | undefined) {
  const [panelData, setPanelData] = useState<Record<string, RunData | null>>({})

  useEffect(() => {
    if (!panels?.length) return
    let cancelled = false
    const runAll = async () => {
      const results: Record<string, RunData | null> = {}
      await Promise.all(
        panels.map(async (panel) => {
          if (!panel.dataSetId) return
          try {
            const res = await axios.post(`/api/datasets/${panel.dataSetId}/run`, { cache: false })
            results[panel.id] = res.data ?? null
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
  }, [panels])

  return panelData
}