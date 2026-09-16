"use client"

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  MonitorSmartphone,
  Search,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Protected } from "@/components/Protected"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSessions } from "@/hooks/use-sessions"
import { formatDate, formatRelative } from "@/lib/utils"

function SessionsContent() {
  const searchParams = useSearchParams()
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const limit = 20

  const { data, isLoading, isError, error } = useSessions({
    page,
    limit,
    search: search || undefined,
    isAdmin: true,
  })

  const sessions = data?.items || []
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
        <h1 className="text-3xl font-bold text-foreground">Sessions</h1>
        <p className="text-muted-foreground mt-1">Daftar sesi login aktif semua pengguna</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Cari user, email, atau username..."
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} variant="outline">
          Cari
        </Button>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              List Session
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {total} {total === 1 ? "session" : "sessions"}
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
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Error loading sessions</h3>
              <p className="text-muted-foreground">{error?.message}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MonitorSmartphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Tidak ada session</h3>
              <p className="text-muted-foreground">Belum ada sesi login yang tercatat</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} title={session.userAgent ?? undefined}>
                    <TableCell>
                      <p className="font-medium">
                        {session.user?.fullname || session.user?.username || "Unknown User"}
                      </p>
                      {session.user && (
                        <p className="text-xs text-muted-foreground">
                          @{session.user.username}
                          {session.user.email ? ` · ${session.user.email}` : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {session.ipAddress || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatRelative(session.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatRelative(session.lastActiveAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(session.expiresAt)}
                    </TableCell>
                    <TableCell>
                      {session.isCurrent ? (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Current
                        </span>
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

export default function SessionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <Protected
        permissions={["sessions:view"]}
        fallback={<AccessDenied description="Halaman Sessions hanya untuk admin." />}
        loading={<div className="p-8 text-center">Loading...</div>}
      >
        <SessionsContent />
      </Protected>
    </Suspense>
  )
}
