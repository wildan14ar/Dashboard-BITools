import DashboardViewer from "@/components/dashboard/dashboard-viewer"
import Providers from "@/components/Providers"

export default async function EmbedDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Providers>
      <DashboardViewer id={id} variant="embed" />
    </Providers>
  )
}
