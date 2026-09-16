"use client"

import { Activity, AlertCircle, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react"
import { Suspense, useState } from "react"
import { Protected } from "@/components/Protected"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLogs } from "@/hooks/use-logs"
import { formatRelative } from "@/lib/utils"

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ERROR: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

function actionClass(action: string): string {
  return ACTION_COLORS[action.toUpperCase()] || "bg-muted text-muted-foreground"
}

function hasMetadata(metadata: unknown): metadata is Record<string, unknown> {
  return typeof metadata === "object" && metadata !== null && Object.keys(metadata).length > 0
}

function LogsContent() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const limit = 20

  const { data, isLoading, isError, error } = useLogs({
    page,
    limit,
    search: search || undefined,
    sort: "createdAt",
    order: "desc",
  })

  const logs = data?.items || []
  const total = data?.pagination.total || 0
  const totalPages = Math.ceil(total / limit)

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">Riwayat aktivitas sistem dan pengguna</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Cari action, entitas, atau user..."
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} variant="outline">
          Cari
        </Button>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Error loading logs</h3>
              <p className="text-muted-foreground">{error?.message}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Tidak ada log</h3>
              <p className="text-muted-foreground">Belum ada aktivitas yang tercatat</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${actionClass(log.action)}`}
                      >
                        {log.action.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{log.entity}</p>
                      {log.entityId && (
                        <p className="max-w-40 truncate text-[10px] text-muted-foreground">
                          {log.entityId}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.user ? (
                        <>
                          {log.user.fullname || log.user.username}{" "}
                          <span className="text-muted-foreground">(@{log.user.username})</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">system</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{log.ip || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatRelative(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      {hasMetadata(log.metadata) ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary hover:underline">
                            JSON
                          </summary>
                          <pre className="mt-1 max-h-32 max-w-64 overflow-auto rounded bg-muted p-2">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
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
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <Protected
        permissions={["logs:view"]}
        fallback={<AccessDenied description="Halaman Activity Logs hanya untuk admin." />}
        loading={<div className="p-8 text-center">Loading...</div>}
      >
        <LogsContent />
      </Protected>
    </Suspense>
  )
}
