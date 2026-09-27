import DashboardViewer from "@/components/dashboard/dashboard-viewer"

export default async function PublicDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DashboardViewer id={id} requirePublic />
}
