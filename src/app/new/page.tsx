"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { dashboardSchema, type DashboardInput } from "@/validation/dashboard"
import { useCreateDashboard } from "@/hooks/use-dashboards"

export default function NewDashboardPage() {
  const router = useRouter()
  const createDashboard = useCreateDashboard()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<DashboardInput>({ resolver: zodResolver(dashboardSchema) })
  const [tagInput, setTagInput] = useState("")

  const tags = watch("tags") ?? []

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setValue("tags", [...tags, tag])
    }
    setTagInput("")
  }

  function removeTag(tag: string) {
    setValue("tags", tags.filter((t) => t !== tag))
  }

  async function onSubmit(data: DashboardInput) {
    createDashboard.mutate(data, {
      onSuccess: (dashboard) => router.push(`/${dashboard.id}/edit`),
    })
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

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Tags</span>
          <div className="flex gap-1.5">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
              placeholder="Press Enter to add"
              className="input flex-1"
            />
            <Button type="button" variant="outline" onClick={addTag}>Add</Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive"><X className="size-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isPublic")} />
          Public dashboard
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || createDashboard.isPending}>Create & Edit</Button>
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
