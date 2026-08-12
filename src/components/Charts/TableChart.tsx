import type { Panel } from "@/hooks/use-dashboards"
import type { RunData } from "@/lib/chart"

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

  if (preview) {
    return (
      <div className="overflow-auto max-h-32">
        <table className="w-full text-[9px]">
          <thead><tr className="border-b">{idxs.map((i) => <th key={i} className="px-1.5 py-0.5 text-left">{data.columns[i]}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">{idxs.map((j) => <td key={j} className="px-1.5 py-0.5">{r.values[j]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="h-full scroll-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left">
            {idxs.map((i) => (
              <th key={i} className="px-2 py-1 font-medium">{data.columns[i]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {idxs.map((j) => (
                <td key={j} className="px-2 py-1">{r.values[j]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
