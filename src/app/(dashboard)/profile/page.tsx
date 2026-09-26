"use client"

import {
  Activity,
  Bell,
  CheckCheck,
  KeyRound,
  Loader2,
  LogOut,
  MonitorSmartphone,
  Search,
  Settings2,
  User as UserIcon,
} from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Protected } from "@/components/Protected"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  type Session,
  useLogs,
  useRevokeAllSessions,
  useRevokeSession,
  useSessions,
} from "@/hooks/use-activity"
import { useAuth } from "@/hooks/use-auth"
import {
  type Notification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from "@/hooks/use-notifications"
import { formatIp, formatLogSummary, shortId } from "@/lib/log-format"
import { formatDate, formatRelative } from "@/lib/utils"
import { PasswordForm } from "./_components/PasswordForm"
import { ProfileForm } from "./_components/ProfileForm"

type Tab = "update" | "password" | "notifikasi" | "sesi" | "log"

const TABS: { key: Tab; label: string; icon: typeof Bell }[] = [
  { key: "update", label: "Update Profil", icon: Settings2 },
  { key: "password", label: "Password", icon: KeyRound },
  { key: "notifikasi", label: "Notifikasi", icon: Bell },
  { key: "sesi", label: "Sesi Saya", icon: MonitorSmartphone },
  { key: "log", label: "Log Saya", icon: Activity },
]

function ProfileBanner() {
  const { user } = useAuth()
  const { data: notifData } = useNotifications({ limit: 1 })
  const { data: sessionData } = useSessions({ page: 1, limit: 1 })

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-card to-card/50 p-8">
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-16 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-5">
        {user?.avatar ? (
          <Image
            src={user.avatar}
            alt={user.fullname || "User"}
            width={88}
            height={88}
            className="rounded-2xl object-cover ring-2 ring-border"
            unoptimized
          />
        ) : (
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-cyan-500 text-white shadow-md">
            <UserIcon size={40} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium">Halo,</p>
          <h2 className="text-2xl font-bold truncate">{user?.fullname || "-"}</h2>
          <p className="text-sm text-muted-foreground truncate">
            @{user?.username} · {user?.email}
          </p>
          {user?.quote ? <p className="text-sm italic mt-1 truncate">“{user.quote}”</p> : null}
        </div>
        <div className="flex gap-6 shrink-0">
          <div className="text-center">
            <p className="text-2xl font-bold">{notifData?.unreadCount ?? "…"}</p>
            <p className="text-xs text-muted-foreground">Belum dibaca</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{sessionData?.pagination.total ?? "…"}</p>
            <p className="text-xs text-muted-foreground">Sesi aktif</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const limit = 10

  const { data, isLoading } = useNotifications({
    page,
    limit,
    unread: unreadOnly,
  })
  const markAsRead = useMarkAsRead()
  const markAll = useMarkAllAsRead()

  const items: Notification[] = data?.items ?? []
  const unreadCount: number = data?.unreadCount ?? 0
  const pagination = data?.pagination
  const totalPages =
    pagination && "total_pages" in pagination
      ? pagination.total_pages
      : Math.ceil(((pagination as { total?: number } | undefined)?.total ?? 0) / limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifikasi
            {unreadCount > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </span>
          <span className="flex items-center gap-2">
            <Button
              variant={unreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setUnreadOnly((v) => !v)
                setPage(1)
              }}
            >
              Belum dibaca
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Tandai semua
              </Button>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Tidak ada notifikasi.</p>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.isRead && markAsRead.mutate(n.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                  n.isRead ? "" : "bg-primary/5 border-primary/20"
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">
                    {!n.isRead && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
                    )}
                    {n.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {formatRelative(n.createdAt)}
                  </span>
                </span>
                {n.body && (
                  <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {n.body}
                  </span>
                )}
              </button>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  Halaman {page} dari {totalPages}
                </span>
                <span className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SessionsTab() {
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading } = useSessions({ page, limit })
  const revokeOne = useRevokeSession()
  const revokeAll = useRevokeAllSessions()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [confirmOthersOpen, setConfirmOthersOpen] = useState(false)

  const handleConfirmRevoke = async () => {
    if (!targetId) return
    try {
      await revokeOne.mutateAsync(targetId)
      setTargetId(null)
    } catch {
      // toast error sudah ditangani api client; dialog tetap terbuka
    }
  }

  const handleConfirmRevokeOthers = async () => {
    try {
      await revokeAll.mutateAsync(undefined)
      setConfirmOthersOpen(false)
    } catch {
      // toast error sudah ditangani api client; dialog tetap terbuka
    }
  }

  const items: Session[] = data?.items ?? []
  const total: number = data?.pagination.total ?? 0
  const totalPages = Math.max(Math.ceil(total / limit), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            Sesi Login Saya ({total})
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={revokeAll.isPending}
            onClick={() => setConfirmOthersOpen(true)}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Cabut lainnya
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Tidak ada sesi.</p>
        ) : (
          <div className="space-y-2">
            {items.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
              >
                <MonitorSmartphone className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {s.ipAddress || "IP tak diketahui"}
                    </span>
                    {s.isCurrent && (
                      <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">
                        Perangkat ini
                      </span>
                    )}
                  </div>
                  <div className="truncate mt-0.5">{s.userAgent || "-"}</div>
                  <div className="mt-0.5">
                    Login {formatRelative(s.createdAt)} · Berakhir {formatDate(s.expiresAt)}
                  </div>
                </div>
                {!s.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revokeOne.isPending}
                    onClick={() => setTargetId(s.id)}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  Halaman {page} dari {totalPages}
                </span>
                <span className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={targetId !== null}
        onOpenChange={(open) => {
          if (!open) setTargetId(null)
        }}
        title="Cabut sesi ini?"
        description="Sesi login di perangkat tersebut akan dicabut."
        confirmLabel="Cabut sesi"
        loading={revokeOne.isPending}
        onConfirm={handleConfirmRevoke}
      />
      <ConfirmDialog
        open={confirmOthersOpen}
        onOpenChange={setConfirmOthersOpen}
        title="Cabut semua sesi lain?"
        description="Semua sesi di perangkat lain akan dicabut. Sesi ini tetap jalan."
        confirmLabel="Cabut lainnya"
        loading={revokeAll.isPending}
        onConfirm={handleConfirmRevokeOthers}
      />
    </Card>
  )
}

function LogsTab() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const limit = 15

  // useLogs tanpa isAdmin = hanya milik sendiri
  const { data, isLoading } = useOwnLogs({ page, limit, search })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Log Aktivitas Saya
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1)
                  setSearch(searchInput)
                }
              }}
              placeholder="Cari aktivitas..."
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setPage(1)
              setSearch(searchInput)
            }}
          >
            Cari
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (data?.items ?? []).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Belum ada aktivitas.</p>
        ) : (
          <div className="space-y-2">
            {(data?.items ?? []).map((log) => (
              <div key={log.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate" title={formatLogSummary(log)}>
                    {formatLogSummary(log)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelative(log.createdAt)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                  {shortId(log.entityId) && (
                    <span title={log.entityId ?? undefined}>{shortId(log.entityId)}</span>
                  )}
                  {formatIp(log.ip) && <span>{formatIp(log.ip)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Wrapper agar tab Log tidak mengirim isAdmin (milik sendiri saja).
function useOwnLogs(params: { page: number; limit: number; search: string }) {
  return useLogs({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
  })
}

const TAB_KEYS = ["update", "password", "notifikasi", "sesi", "log"] as const

function ProfileContent() {
  const searchParams = useSearchParams()
  const initialTab = (() => {
    const q = searchParams.get("tab")
    return (TAB_KEYS as readonly string[]).includes(q ?? "") ? (q as Tab) : "update"
  })()
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className="space-y-6 p-10">
      <ProfileBanner />

      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit max-w-full overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "update" && <ProfileForm />}
      {tab === "password" && <PasswordForm />}
      {tab === "notifikasi" && <NotificationsTab />}
      {tab === "sesi" && <SessionsTab />}
      {tab === "log" && <LogsTab />}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Protected>
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <ProfileContent />
      </Suspense>
    </Protected>
  )
}
