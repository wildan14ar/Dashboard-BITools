import type { Panel } from "@/hooks/use-dashboards"
import { aggregate, type RunData } from "@/lib/chart"
import { cn } from "@/lib/utils"

type PivotResult = {
  rowLabel: string
  rowVals: string[]
  colVals: string[]
  cells: number[][]
  rowTotals: number[]
  colTotals: number[]
  grandTotal: number
}

function computePivot(
  data: RunData,
  rowIdx: number,
  colIdx: number,
  valIdx: number,
  agg: string,
): PivotResult {
  const rowVals = [...new Set(data.rows.map((r) => r.values[rowIdx] ?? ""))].sort()
  const colVals = [...new Set(data.rows.map((r) => r.values[colIdx] ?? ""))].sort()

  const grid = new Map<string, string[]>()
  for (const r of data.rows) {
    const key = `${r.values[rowIdx] ?? ""}\u0000${r.values[colIdx] ?? ""}`
    const v = r.values[valIdx]
    if (v !== null && v !== undefined && v !== "") {
      const arr = grid.get(key)
      if (arr) arr.push(v)
      else grid.set(key, [v])
    }
  }

  const aggVal = (vals: string[]) => {
    if (vals.length === 0) return 0
    if (agg === "count") return vals.length
    return aggregate(vals, agg)
  }

  const cells = rowVals.map((rv) => colVals.map((cv) => aggVal(grid.get(`${rv}\u0000${cv}`) ?? [])))
  const rowTotals = cells.map((row) => row.reduce((a, b) => a + b, 0))
  const colTotals = colVals.map((_, i) => cells.reduce((a, row) => a + row[i], 0))
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0)

  return {
    rowLabel: data.columns[rowIdx] ?? "",
    rowVals,
    colVals,
    cells,
    rowTotals,
    colTotals,
    grandTotal,
  }
}

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

type Props = {
  panel: Panel
  data: RunData
  preview?: boolean
}

export function PivotTable({ panel, data, preview = false }: Props) {
  const cfg = (panel.config as Record<string, unknown>) ?? {}
  const rowIdx = Number(cfg.pivotRowCol) || 0
  const colIdx = Number(cfg.pivotColCol) || 1
  const valIdx = Number(cfg.pivotValueCol) || 2
  const agg = (cfg.pivotAgg as string) || "sum"
  const horizontal = (cfg.tableScroll as string) === "horizontal"

  const { rowLabel, rowVals, colVals, cells, rowTotals, colTotals, grandTotal } = computePivot(
    data,
    rowIdx,
    colIdx,
    valIdx,
    agg,
  )

  const cellCls = cn(
    preview ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-xs",
    "border border-border/70",
  )
  const headCls = cn("sticky top-0 z-10 font-medium text-left bg-muted", cellCls)

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
            <th className={headCls}>{rowLabel || "Rows"}</th>
            {colVals.map((cv) => (
              <th key={cv} className={headCls}>
                {cv}
              </th>
            ))}
            <th className={headCls}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rowVals.map((rv, i) => (
            <tr key={rv} className={cn(i % 2 === 1 && "bg-muted/20")}>
              <td className={cn("font-medium bg-muted/30", cellCls)}>{rv}</td>
              {cells[i].map((c, j) => (
                <td key={j} className={cn("tabular-nums text-right", cellCls)}>
                  {fmt(c)}
                </td>
              ))}
              <td className={cn("bg-muted/30 font-medium tabular-nums text-right", cellCls)}>
                {fmt(rowTotals[i])}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className={cn("sticky bottom-0 z-10 bg-muted", cellCls)}>Total</th>
            {colTotals.map((ct, j) => (
              <td
                key={j}
                className={cn(
                  "sticky bottom-0 z-10 bg-muted font-medium tabular-nums text-right",
                  cellCls,
                )}
              >
                {fmt(ct)}
              </td>
            ))}
            <td
              className={cn(
                "sticky bottom-0 z-10 bg-muted font-semibold tabular-nums text-right",
                cellCls,
              )}
            >
              {fmt(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
