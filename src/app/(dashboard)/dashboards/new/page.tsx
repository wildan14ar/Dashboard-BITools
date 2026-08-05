"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { dashboardSchema, type DashboardInput } from "@/validation/dashboard"

export default function NewDashboardPage() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DashboardInput>({ resolver: zodResolver(dashboardSchema) })

  async function onSubmit(data: DashboardInput) {
    const { data: dashboard } = await axios.post("/api/dashboards", data)
    router.push(`/dashboards/${dashboard.id}/edit`)
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <h1 className="text-2xl font-bold">New Dashboard</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Name</span>
          <input {...register("name")} placeholder="Sales Overview" className="input" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Description</span>
          <textarea {...register("description")} placeholder="Optional" className="input py-2" rows={3} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isPublic")} />
          Public dashboard
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>Create & Edit</Button>
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
