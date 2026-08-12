import type { Panel } from "@/hooks/use-dashboards"
import type { RunData } from "@/lib/chart"
import { cn } from "@/lib/utils"

type Props = {
  panel: Panel
  data: RunData | null | undefined
  preview?: boolean
}

export function TableChart({ panel, data, preview = false }: Props) {
  if (!data) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
  }
  const rows = data.rows.slice(0, preview ? 4 : 100)
  const cfg = (panel.config as Record<string, unknown>) ?? {}
  const sel = (cfg.columns as number[]) ?? []
  const idxs = sel.length ? sel : data.columns.map((_: string, i: number) => i)
  const cellCls = preview ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-xs"

  return (
    <div className={cn("scroll-hidden", preview ? "max-h-32 overflow-auto" : "h-full")}>
      <table className="w-full">
        <thead>
          <tr className="border-b text-left">
            {idxs.map((i) => (
              <th key={i} className={cn("font-medium", cellCls)}>{data.columns[i]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {idxs.map((j) => (
                <td key={j} className={cellCls}>{r.values[j]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}