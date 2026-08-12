"use client"

import { useParams } from "next/navigation"
import DashboardViewer from "@/components/dashboard-viewer"

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>()
  return <DashboardViewer id={id} variant="embed" />
}
