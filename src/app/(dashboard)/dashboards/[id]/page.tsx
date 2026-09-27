"use client"

import { ExternalLink, Loader2, Settings2, UserPlus, UserX } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Suspense, useState } from "react"
import DashboardGrid from "@/components/dashboard/dashboard-grid"
import { Protected } from "@/components/Protected"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { DashboardFilterProvider } from "@/hooks/use-dashboard-filters"
import {
  useAddDashboardMember,
  useDashboard,
  useRemoveDashboardMember,
  useSetDashboardPublic,
} from "@/hooks/use-dashboards"

function DashboardViewContent({ id }: { id: string }) {
  const { data: dashboard, isLoading } = useDashboard(id)
  const setPublic = useSetDashboardPublic()
  const addMember = useAddDashboardMember()
  const removeMember = useRemoveDashboardMember()
  const [memberUserId, setMemberUserId] = useState("")

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <p className="p-10 text-center text-sm text-muted-foreground">Dashboard tidak ditemukan.</p>
    )
  }

  const members = dashboard.members ?? []

  return (
    <DashboardFilterProvider>
      <div className="space-y-6 p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-on-surface">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="text-on-surface-variant mt-1">{dashboard.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Protected permissions={["dashboards:admin"]}>
              <Link href={`/bi/${dashboard.id}`} target="_blank">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Lihat Publik
                </Button>
              </Link>
            </Protected>
            <Protected permissions={["dashboards:update"]}>
              <Link href={`/dashboards/${dashboard.id}/edit`}>
                <Button size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </Protected>
          </div>
        </div>

        <DashboardGrid dashboard={dashboard} />

        <Protected permissions={["dashboards:admin"]}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sharing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="db-ispublic"
                  checked={dashboard.isPublic}
                  disabled={setPublic.isPending}
                  onCheckedChange={(v) => setPublic.mutate({ dashboardId: id, isPublic: v })}
                />
                <Label htmlFor="db-ispublic">
                  Public dashboard (bisa dilihat di /bi/{dashboard.id})
                </Label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  placeholder="User ID untuk ditambah sebagai member"
                  className="max-w-sm"
                />
                <Button
                  variant="outline"
                  disabled={!memberUserId.trim() || addMember.isPending}
                  onClick={() => {
                    addMember.mutate(
                      { dashboardId: id, userId: memberUserId.trim() },
                      { onSuccess: () => setMemberUserId("") },
                    )
                  }}
                >
                  {addMember.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Tambah
                </Button>
              </div>
              {addMember.isError && (
                <p className="text-xs font-medium text-destructive">
                  {addMember.error?.message ?? "Gagal menambah member"}
                </p>
              )}
              {members.length > 0 && (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 text-sm rounded-lg border border-border px-3 py-2"
                    >
                      <span className="font-medium">{m.user?.username ?? m.userId}</span>
                      <span className="text-xs text-muted-foreground font-mono">{m.role}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-error hover:text-error"
                        disabled={removeMember.isPending}
                        onClick={() => removeMember.mutate({ dashboardId: id, userId: m.userId })}
                        aria-label="Hapus member"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Protected>
      </div>
    </DashboardFilterProvider>
  )
}

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>()
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <DashboardViewContent id={params.id} />
    </Suspense>
  )
}
