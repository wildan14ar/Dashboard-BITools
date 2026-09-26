"use client"

import { Activity, AlertCircle, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react"
import { Suspense, useState } from "react"
import { Protected } from "@/components/Protected"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLogs } from "@/hooks/use-activity"
import { formatIp, formatLogSummary, shortId } from "@/lib/log-format"
import { formatRelative } from "@/lib/utils"

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ERROR: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

function actionClass(action: string): string {
  return ACTION_COLORS[action.toUpperCase()] || "bg-surface-container text-on-surface-variant"
}

const ACTION_OPTIONS = ["CREATE", "UPDATE", "DELETE", "ERROR"] as const

function LogsContent() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [action, setAction] = useState<string>("all")
  const [entityInput, setEntityInput] = useState("")
  const [entity, setEntity] = useState("")
  const limit = 20

  const { data, isLoading, isError, error } = useLogs({
    page,
    limit,
    search: search || undefined,
    action: action === "all" ? undefined : action,
    entity: entity || undefined,
    isAdmin: true,
    sort: "createdAt",
    order: "desc",
  })

  const logs = data?.items || []
  const total = data?.pagination.total || 0
  const totalPages = data?.pagination.total_pages ?? Math.ceil(total / limit)

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
    setEntity(entityInput)
  }

  const handleActionChange = (value: string) => {
    setPage(1)
    setAction(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-surface">Activity Logs</h1>
        <p className="text-on-surface-variant mt-1">Riwayat aktivitas sistem dan pengguna</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Cari action, entitas, atau user..."
            className="pl-9"
          />
        </div>
        <Input
          value={entityInput}
          onChange={(e) => setEntityInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Entitas (cth User, Session)..."
          className="w-48"
        />
        <Select value={action} onValueChange={handleActionChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua action</SelectItem>
            {ACTION_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} variant="outline">
          Cari
        </Button>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              List Log
            </span>
            <span className="text-sm font-normal text-on-surface-variant">
              {total} {total === 1 ? "log" : "logs"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-error mb-4" />
              <h3 className="text-lg font-semibold">Error loading logs</h3>
              <p className="text-on-surface-variant">{error?.message}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-on-surface-variant mb-4" />
              <h3 className="text-lg font-semibold">Tidak ada log</h3>
              <p className="text-on-surface-variant">Belum ada aktivitas yang tercatat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {/* Action badge */}
                  <div
                    className={`text-xs font-semibold px-2 py-1 rounded shrink-0 ${actionClass(log.action)}`}
                  >
                    {log.action.toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold truncate" title={formatLogSummary(log)}>
                        {formatLogSummary(log)}
                      </h3>
                      <span className="text-xs text-on-surface-variant whitespace-nowrap">
                        {formatRelative(log.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                      {log.user ? (
                        <span>
                          by {log.user.fullname || log.user.username} (@{log.user.username})
                        </span>
                      ) : (
                        <span>by system</span>
                      )}
                      {shortId(log.entityId) && (
                        <span title={log.entityId ?? undefined}>· {shortId(log.entityId)}</span>
                      )}
                      {formatIp(log.ip) && <span>· {formatIp(log.ip)}</span>}
                    </div>
                    {log.metadata &&
                    typeof log.metadata === "object" &&
                    Object.keys(log.metadata as object).length > 0 ? (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-on-surface-variant hover:text-foreground w-fit">
                          Lihat metadata
                        </summary>
                        <pre className="bg-surface-container rounded p-2 mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LogsPage() {
  return (
    <Protected
      permissions={["logs:read"]}
      fallback={
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Akses ditolak</h3>
          <p className="text-on-surface-variant">Anda tidak memiliki izin melihat log aktivitas.</p>
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <LogsContent />
      </Suspense>
    </Protected>
  )
}
