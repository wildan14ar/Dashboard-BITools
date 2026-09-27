"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { Suspense, useState } from "react"
import { useForm } from "react-hook-form"
import { Protected } from "@/components/Protected"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateDashboard } from "@/hooks/use-dashboards"
import { type DashboardInput, dashboardSchema } from "@/validations/dashboard"

function NewDashboardContent() {
  const router = useRouter()
  const createDashboard = useCreateDashboard()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<DashboardInput>({ resolver: zodResolver(dashboardSchema) })
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
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
    )
  }

  async function onSubmit(data: DashboardInput) {
    createDashboard.mutate(data, {
      onSuccess: (dashboard) => router.push(`/dashboards/${dashboard.id}/edit`),
    })
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">New Dashboard</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="block space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} placeholder="Sales Overview" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="block space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register("description")} placeholder="Optional" rows={3} />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Tags</span>
          <div className="flex gap-1.5">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Press Enter to add"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
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
          <Button type="submit" disabled={isSubmitting || createDashboard.isPending}>
            Create & Edit
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewDashboardPage() {
  return (
    <Protected
      permissions={["dashboards:create"]}
      fallback={
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold">Akses ditolak</h3>
          <p className="text-on-surface-variant">Butuh permission dashboards:create.</p>
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <NewDashboardContent />
      </Suspense>
    </Protected>
  )
}
