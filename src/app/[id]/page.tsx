"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ExternalLink, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboard } from "@/hooks/use-dashboards"
import DashboardGrid from "@/components/dashboard/dashboard-grid"

export default function DashboardViewPage() {
  const { id } = useParams<{ id: string }>()
  const { data: dashboard, isLoading } = useDashboard(id)

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (!dashboard) return <div className="p-6 text-sm text-muted-foreground">Dashboard not found</div>

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
          {dashboard.description && <p className="mt-1 text-sm text-muted-foreground">{dashboard.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/bi/embed/${dashboard.id}`} target="_blank">
            <Button variant="outline" size="sm"><ExternalLink className="size-4" /> Embed</Button>
          </Link>
          <Link href={`/${dashboard.id}/edit`}>
            <Button size="sm"><Settings2 className="size-4" /> Edit</Button>
          </Link>
        </div>
      </div>
      <DashboardGrid dashboard={dashboard} />
    </div>
  )
}