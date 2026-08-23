"use client"

import { useParams } from "next/navigation"
import DashboardViewer from "@/components/dashboard/dashboard-viewer"

export default function PublicDashboardPage() {
  const { id } = useParams<{ id: string }>()
  return <DashboardViewer id={id} variant="public" requirePublic />
}
