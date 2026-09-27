import { PivotTable } from "@/components/charts/table-pivot"
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
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    )
  }
  const cfg = (panel.config as Record<string, unknown>) ?? {}
  if ((cfg.tableMode as string) === "pivot") {
    return <PivotTable panel={panel} data={data} preview={preview} />
  }
  const rows = data.rows.slice(0, preview ? 4 : 100)
  const sel = (cfg.columns as number[]) ?? []
  const idxs = sel.length ? sel : data.columns.map((_: string, i: number) => i)
  const horizontal = (cfg.tableScroll as string) === "horizontal"
  const cellCls = cn(
    preview ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-xs",
    "border border-border/70",
  )

  return (
    <div
      className={cn("scroll-hidden", preview ? "max-h-32" : "h-full")}
      style={{
        overflowX: horizontal ? "auto" : "hidden",
        overflowY: "auto",
      }}
    >
      <table
        className={cn(
          "border-separate border-spacing-0",
          horizontal ? "min-w-full whitespace-nowrap" : "w-full",
        )}
      >
        <thead>
          <tr>
            {idxs.map((i) => (
              <th
                key={i}
                className={cn("sticky top-0 z-10 font-medium text-left bg-muted", cellCls)}
              >
                {data.columns[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn(i % 2 === 1 && "bg-muted/20")}>
              {idxs.map((j) => (
                <td key={j} className={cellCls}>
                  {r.values[j]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
