"use client"

import type { RunData } from "@/lib/chart"

function formatCell(v: string): string {
  return v ?? ""
}

export default function ResultTable({
  data,
  maxHeight = 320,
}: {
  data: RunData
  maxHeight?: number
}) {
  const columns = data.columns ?? []
  const rows = data.rows ?? []

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {typeof data.row_count === "number" && <span>{data.row_count} baris</span>}
        {typeof data.execution_time_ms === "number" && <span>· {data.execution_time_ms} ms</span>}
        {data.cached && (
          <span className="rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 font-medium">
            cached
          </span>
        )}
        {data.truncated && (
          <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-medium">
            truncated
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Tidak ada baris.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-auto" style={{ maxHeight }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {columns.map((c, i) => (
                  <th key={i} className="text-left font-medium px-3 py-2 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-accent/30">
                  {r.values.map((v, j) => (
                    <td key={j} className="px-3 py-1.5 whitespace-nowrap font-mono text-xs">
                      {formatCell(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
