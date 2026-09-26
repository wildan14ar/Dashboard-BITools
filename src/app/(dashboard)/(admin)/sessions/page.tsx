"use client"

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  LogOut,
  MonitorSmartphone,
  Search,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Protected } from "@/components/Protected"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  type Session,
  useRevokeAllSessions,
  useRevokeSession,
  useSessions,
} from "@/hooks/use-activity"
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
  const revokeSession = useRevokeSession()
  const revokeAll = useRevokeAllSessions()
  const [targetSession, setTargetSession] = useState<Session | null>(null)
  const [confirmAllOpen, setConfirmAllOpen] = useState(false)

  const sessions = data?.items || []
  const total = data?.pagination.total || 0
  const totalPages = data?.pagination.total_pages ?? Math.ceil(total / limit)

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const handleConfirmRevoke = async () => {
    if (!targetSession) return
    try {
      await revokeSession.mutateAsync(targetSession.id)
      setTargetSession(null)
    } catch {
      // toast error sudah ditangani api client; dialog tetap terbuka
    }
  }

  const handleConfirmRevokeAll = async () => {
    try {
      await revokeAll.mutateAsync({ all: true })
      setConfirmAllOpen(false)
    } catch {
      // toast error sudah ditangani api client; dialog tetap terbuka
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Sessions</h1>
          <p className="text-on-surface-variant mt-1">Daftar sesi login aktif semua pengguna</p>
        </div>
        <Protected permissions={["sessions:revoke"]}>
          <Button
            variant="outline"
            disabled={revokeAll.isPending}
            onClick={() => setConfirmAllOpen(true)}
          >
            {revokeAll.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Cabut semua sesi
          </Button>
        </Protected>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
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

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              List Session
            </span>
            <span className="text-sm font-normal text-on-surface-variant">
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
              <AlertCircle className="h-12 w-12 text-error mb-4" />
              <h3 className="text-lg font-semibold">Error loading sessions</h3>
              <p className="text-on-surface-variant">{error?.message}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MonitorSmartphone className="h-12 w-12 text-on-surface-variant mb-4" />
              <h3 className="text-lg font-semibold">Tidak ada session</h3>
              <p className="text-on-surface-variant">Belum ada sesi login yang tercatat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                    <MonitorSmartphone className="w-5 h-5 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {session.user?.fullname || session.user?.username || "Unknown User"}
                      </h3>
                      {session.isCurrent && (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded whitespace-nowrap">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant mb-1">
                      {session.user && <span>@{session.user.username}</span>}
                      {session.user?.email && <span>{session.user.email}</span>}
                      {session.ipAddress && <span>IP: {session.ipAddress}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                      <span>Login {formatRelative(session.createdAt)}</span>
                      <span>•</span>
                      <span>Last activity {formatRelative(session.lastActiveAt)}</span>
                      <span>•</span>
                      <span>Expires {formatDate(session.expiresAt)}</span>
                    </div>
                    {session.userAgent && (
                      <div className="text-xs text-on-surface-variant mt-1 truncate">
                        {session.userAgent}
                      </div>
                    )}
                  </div>

                  {/* Revoke */}
                  <Protected permissions={["sessions:revoke"]}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-error hover:text-error"
                      disabled={session.isCurrent || revokeSession.isPending}
                      title={
                        session.isCurrent
                          ? "Sesi aktif ini tidak dapat dicabut (gunakan logout)"
                          : "Cabut sesi ini"
                      }
                      onClick={() => setTargetSession(session)}
                    >
                      {revokeSession.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">Cabut</span>
                    </Button>
                  </Protected>
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
      <ConfirmDialog
        open={targetSession !== null}
        onOpenChange={(open) => {
          if (!open) setTargetSession(null)
        }}
        title="Cabut sesi ini?"
        description={
          targetSession
            ? `Sesi login "${targetSession.user?.fullname || targetSession.user?.username || targetSession.id}" akan dicabut dan pengguna harus login ulang.`
            : undefined
        }
        confirmLabel="Cabut sesi"
        loading={revokeSession.isPending}
        onConfirm={handleConfirmRevoke}
      />
      <ConfirmDialog
        open={confirmAllOpen}
        onOpenChange={setConfirmAllOpen}
        title="Cabut SEMUA sesi?"
        description="Semua sesi SEMUA user akan dicabut dan semua pengguna harus login ulang (sesi Anda tetap jalan)."
        confirmLabel="Cabut semua sesi"
        loading={revokeAll.isPending}
        onConfirm={handleConfirmRevokeAll}
      />
    </div>
  )
}

export default function SessionsPage() {
  return (
    <Protected
      permissions={["sessions:read"]}
      fallback={
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Akses ditolak</h3>
          <p className="text-on-surface-variant">Anda tidak memiliki izin melihat sessions.</p>
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <SessionsContent />
      </Suspense>
    </Protected>
  )
}
